Timeline @0200000D text

using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Emit;
using System.Text;
using System.Xml;
using Harmony;
using HSExtSave;
using IllusionPlugin;
using Studio;
using ToolBox;
using ToolBox.Extensions;
using UILib;
using UILib.ContextMenu;
using UILib.EventHandlers;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Timeline
{
	// Token: 0x0200000D RID: 13
	public class Timeline : GenericPlugin, IEnhancedPlugin, IPlugin
	{
		// Token: 0x1700000C RID: 12
		// (get) Token: 0x0600005A RID: 90 RVA: 0x000058C8 File Offset: 0x00003AC8
		public override string Name
		{
			get
			{
				return "Timeline";
			}
		}

		// Token: 0x1700000D RID: 13
		// (get) Token: 0x0600005B RID: 91 RVA: 0x000058D0 File Offset: 0x00003AD0
		public override string Version
		{
			get
			{
				return "1.1.0";
			}
		}

		// Token: 0x1700000E RID: 14
		// (get) Token: 0x0600005C RID: 92 RVA: 0x000058D8 File Offset: 0x00003AD8
		public override string[] Filter
		{
			get
			{
				return new string[]
				{
					"StudioNEO_32",
					"StudioNEO_64"
				};
			}
		}

		// Token: 0x1700000F RID: 15
		// (get) Token: 0x0600005D RID: 93 RVA: 0x000058F0 File Offset: 0x00003AF0
		public static float playbackTime
		{
			get
			{
				return Timeline._self._playbackTime;
			}
		}

		// Token: 0x17000010 RID: 16
		// (get) Token: 0x0600005E RID: 94 RVA: 0x000058FC File Offset: 0x00003AFC
		public static float duration
		{
			get
			{
				return Timeline._self._duration;
			}
		}

		// Token: 0x17000011 RID: 17
		// (get) Token: 0x0600005F RID: 95 RVA: 0x00005908 File Offset: 0x00003B08
		public static bool isPlaying
		{
			get
			{
				return Timeline._self._isPlaying;
			}
		}

		// Token: 0x06000060 RID: 96 RVA: 0x00005914 File Offset: 0x00003B14
		protected override void Awake()
		{
			base.Awake();
			Timeline._self = this;
			Timeline._assemblyLocation = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
			Timeline._singleFilesFolder = Path.Combine(Timeline._assemblyLocation, Path.Combine("Timeline", "Single Files"));
			HSExtSave.RegisterHandler("timeline", null, null, new HSExtSave.ExtSaveSceneReadHandler(this.SceneLoad), new HSExtSave.ExtSaveSceneReadHandler(this.SceneImport), new HSExtSave.ExtSaveSceneWriteHandler(this.SceneWrite), null, null);
			HarmonyInstance harmonyInstance = HarmonyExtensions.CreateInstance("com.joan6694.illusionplugins.timeline");
			harmonyInstance.PatchAllSafe();
			Timeline.OCI_OnDelete_Patches.ManualPatch(harmonyInstance);
		}

		// Token: 0x06000061 RID: 97 RVA: 0x000059AC File Offset: 0x00003BAC
		protected override void LevelLoaded(int level)
		{
			if (level == 3)
			{
				this.Init();
			}
		}

		// Token: 0x06000062 RID: 98 RVA: 0x000059BC File Offset: 0x00003BBC
		protected override void Update()
		{
			if (!this._loaded)
			{
				return;
			}
			if (Input.GetKey(306) && Input.GetKeyDown(116))
			{
				this._ui.gameObject.SetActive(!this._ui.gameObject.activeSelf);
				if (this._ui.gameObject.activeSelf)
				{
					Action <>9__2;
					this.ExecuteDelayed(delegate()
					{
						this.UpdateInterpolablesView();
						IPlugin <>4__this = this;
						Action action;
						if ((action = <>9__2) == null)
						{
							action = (<>9__2 = delegate()
							{
								this._grid.parent.gameObject.SetActive(false);
								this._grid.parent.gameObject.SetActive(true);
								LayoutRebuilder.MarkLayoutForRebuild((RectTransform)this._grid.parent);
							});
						}
						<>4__this.ExecuteDelayed(action, 4);
					}, 2);
				}
				else
				{
					UIUtility.HideContextMenu();
				}
			}
			if (Input.GetKey(308) && Input.GetKeyDown(116))
			{
				if (this._isPlaying)
				{
					Timeline.Pause();
				}
				else
				{
					Timeline.Play();
				}
			}
			this._totalActiveExpressions = this._allExpressions.Count((Expression e) => e.enabled && e.gameObject.activeInHierarchy);
			this._currentExpressionIndex = 0;
			GuideObject guideObject = this._selectedGuideObjects.FirstOrDefault<GuideObject>();
			if (this._selectedGuideObject != guideObject)
			{
				ObjectCtrlInfo objectCtrlInfo = null;
				this._selectedGuideObject = guideObject;
				Func<KeyValuePair<int, ObjectCtrlInfo>, bool> <>9__3;
				while (guideObject != null)
				{
					IEnumerable<KeyValuePair<int, ObjectCtrlInfo>> dicObjectCtrl = Singleton<Studio>.Instance.dicObjectCtrl;
					Func<KeyValuePair<int, ObjectCtrlInfo>, bool> predicate;
					if ((predicate = <>9__3) == null)
					{
						predicate = (<>9__3 = ((KeyValuePair<int, ObjectCtrlInfo> p) => p.Value.guideObject == guideObject));
					}
					ObjectCtrlInfo value = dicObjectCtrl.FirstOrDefault(predicate).Value;
					if (value != null)
					{
						objectCtrlInfo = value;
						break;
					}
					guideObject = guideObject.parentGuide;
				}
				if (this._selectedOCI != objectCtrlInfo)
				{
					this._selectedOCI = objectCtrlInfo;
					this.UpdateInterpolablesView();
					this.UpdateKeyframeWindow(false);
				}
			}
			if (this._toDelete.Count != 0)
			{
				this.RemoveInterpolables(this._toDelete);
				this._toDelete.Clear();
			}
			Vector2 vector;
			if (this._tooltip.transform.parent.gameObject.activeSelf && RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)this._tooltip.transform.parent.parent, Input.mousePosition, this._ui.worldCamera, ref vector))
			{
				this._tooltip.transform.parent.position = this._tooltip.transform.parent.parent.TransformPoint(vector);
			}
			if (this._ui.gameObject.activeSelf)
			{
				if (Input.GetKey(306))
				{
					if (Input.GetKeyDown(99))
					{
						this.CopyKeyframes();
					}
					else if (Input.GetKeyDown(120))
					{
						this.CutKeyframes();
					}
					else if (Input.GetKeyDown(118))
					{
						this.PasteKeyframes();
					}
				}
				if (!this._speedInputField.isFocused)
				{
					this._speedInputField.text = Time.timeScale.ToString("0.#####");
				}
			}
			this.InterpolateBefore();
		}

		// Token: 0x06000063 RID: 99 RVA: 0x00005CD8 File Offset: 0x00003ED8
		private void PostLateUpdate()
		{
			if (this._ui.gameObject.activeSelf && (Input.GetMouseButtonDown(0) || Input.GetMouseButtonDown(2)) && UIUtility.IsContextMenuDisplayed() && !UIUtility.WasClickInContextMenu())
			{
				UIUtility.HideContextMenu();
			}
			this.InterpolateAfter();
		}

		// Token: 0x06000064 RID: 100 RVA: 0x00005D34 File Offset: 0x00003F34
		public static void Play()
		{
			if (!Timeline._self._isPlaying)
			{
				Timeline._self._isPlaying = true;
				Timeline._self._startTime = Time.time - Timeline._self._playbackTime;
				return;
			}
			Timeline.Pause();
		}

		// Token: 0x06000065 RID: 101 RVA: 0x00005D70 File Offset: 0x00003F70
		public static void Pause()
		{
			Timeline._self._isPlaying = false;
		}

		// Token: 0x06000066 RID: 102 RVA: 0x00005D80 File Offset: 0x00003F80
		public static void Stop()
		{
			Timeline._self._playbackTime = 0f;
			Timeline._self.UpdateCursor();
			Timeline._self.Interpolate(true);
			Timeline._self.Interpolate(false);
			Timeline._self._isPlaying = false;
		}

		// Token: 0x06000067 RID: 103 RVA: 0x00005DBC File Offset: 0x00003FBC
		public static void PreviousFrame()
		{
			float num = 1f / (float)Timeline._self._desiredFrameRate;
			float num2 = Timeline._self._playbackTime % Timeline._self._duration;
			float num3 = num2 % num;
			if (num3 / num < 0.5f)
			{
				num2 -= num3;
			}
			else
			{
				num2 += num - num3;
			}
			num2 -= num;
			if (num2 < 0f)
			{
				num2 = 0f;
			}
			Timeline._self.SeekPlaybackTime(num2);
		}

		// Token: 0x06000068 RID: 104 RVA: 0x00005E38 File Offset: 0x00004038
		public static void NextFrame()
		{
			float num = 1f / (float)Timeline._self._desiredFrameRate;
			float num2 = Timeline._self._playbackTime % Timeline._self._duration;
			float num3 = num2 % num;
			if (num3 / num < 0.5f)
			{
				num2 -= num3;
			}
			else
			{
				num2 += num - num3;
			}
			num2 += num;
			if (num2 > Timeline._self._duration)
			{
				num2 = Timeline._self._duration;
			}
			Timeline._self.SeekPlaybackTime(num2);
		}

		// Token: 0x06000069 RID: 105 RVA: 0x00005EBC File Offset: 0x000040BC
		public static void AddInterpolableModel(InterpolableModel model)
		{
			List<InterpolableModel> list;
			if (!Timeline._self._interpolableModelsDictionary.TryGetValue(model.owner, out list))
			{
				list = new List<InterpolableModel>();
				Timeline._self._interpolableModelsDictionary.Add(model.owner, list);
			}
			list.Add(model);
			Timeline._self._interpolableModelsList.Add(model);
		}

		// Token: 0x0600006A RID: 106 RVA: 0x00005F1C File Offset: 0x0000411C
		public static void AddInterpolableModelStatic(string owner, string id, object parameter, string name, InterpolableDelegate interpolateBefore, InterpolableDelegate interpolateAfter, Func<ObjectCtrlInfo, bool> isCompatibleWithTarget, Func<ObjectCtrlInfo, object, object> getValue, Func<object, XmlNode, object> readValueFromXml, Action<object, XmlTextWriter, object> writeValueToXml, Func<ObjectCtrlInfo, XmlNode, object> readParameterFromXml = null, Action<ObjectCtrlInfo, XmlTextWriter, object> writeParameterToXml = null, Func<ObjectCtrlInfo, object, object, object, bool> checkIntegrity = null, bool useOciInHash = true, Func<string, ObjectCtrlInfo, object, string> getFinalName = null, Func<ObjectCtrlInfo, object, bool> shouldShow = null)
		{
			Timeline.AddInterpolableModel(new InterpolableModel(owner, id, parameter, name, interpolateBefore, interpolateAfter, isCompatibleWithTarget, getValue, readValueFromXml, writeValueToXml, readParameterFromXml, writeParameterToXml, checkIntegrity, useOciInHash, getFinalName, shouldShow));
		}

		// Token: 0x0600006B RID: 107 RVA: 0x00005F54 File Offset: 0x00004154
		public static void AddInterpolableModelDynamic(string owner, string id, string name, InterpolableDelegate interpolateBefore, InterpolableDelegate interpolateAfter, Func<ObjectCtrlInfo, bool> isCompatibleWithTarget, Func<ObjectCtrlInfo, object, object> getValue, Func<object, XmlNode, object> readValueFromXml, Action<object, XmlTextWriter, object> writeValueToXml, Func<ObjectCtrlInfo, object> getParameter, Func<ObjectCtrlInfo, XmlNode, object> readParameterFromXml = null, Action<ObjectCtrlInfo, XmlTextWriter, object> writeParameterToXml = null, Func<ObjectCtrlInfo, object, object, object, bool> checkIntegrity = null, bool useOciInHash = true, Func<string, ObjectCtrlInfo, object, string> getFinalName = null, Func<ObjectCtrlInfo, object, bool> shouldShow = null)
		{
			Timeline.AddInterpolableModel(new InterpolableModel(owner, id, name, interpolateBefore, interpolateAfter, isCompatibleWithTarget, getValue, readValueFromXml, writeValueToXml, getParameter, readParameterFromXml, writeParameterToXml, checkIntegrity, useOciInHash, getFinalName, shouldShow));
		}

		// Token: 0x0600006C RID: 108 RVA: 0x00005F8C File Offset: 0x0000418C
		public static void RefreshInterpolablesList()
		{
			if (!Timeline._refreshInterpolablesListScheduled)
			{
				Timeline._refreshInterpolablesListScheduled = true;
				Timeline._self.ExecuteDelayed(delegate()
				{
					Timeline._refreshInterpolablesListScheduled = false;
					Timeline._self.UpdateInterpolablesView();
				}, 1);
			}
		}

		// Token: 0x0600006D RID: 109 RVA: 0x00005FCC File Offset: 0x000041CC
		private Interpolable AddInterpolable(InterpolableModel model)
		{
			bool flag = false;
			Interpolable interpolable = null;
			try
			{
				if (!model.IsCompatibleWithTarget(this._selectedOCI))
				{
					return null;
				}
				Interpolable interpolable2 = new Interpolable(this._selectedOCI, model);
				if (!this._interpolables.TryGetValue(interpolable2.GetHashCode(), out interpolable))
				{
					this._interpolables.Add(interpolable2.GetHashCode(), interpolable2);
					this._interpolablesTree.AddLeaf(interpolable2, null);
					interpolable = interpolable2;
					flag = true;
				}
				this.UpdateInterpolablesView();
				return interpolable;
			}
			catch (Exception ex)
			{
				string str = "Timeline: Couldn't add interpolable with model:\n";
				string str2 = (model != null) ? model.ToString() : null;
				string str3 = "\n";
				Exception ex2 = ex;
				Debug.LogError(str + str2 + str3 + ((ex2 != null) ? ex2.ToString() : null));
				if (flag)
				{
					this._interpolables.Remove(interpolable.GetHashCode());
					this._interpolablesTree.RemoveLeaf(interpolable);
					this.UpdateInterpolablesView();
				}
			}
			return null;
		}

		// Token: 0x0600006E RID: 110 RVA: 0x000060CC File Offset: 0x000042CC
		private void RemoveInterpolable(Interpolable interpolable)
		{
			this._interpolables.Remove(interpolable.GetHashCode());
			int num = this._selectedInterpolables.IndexOf(interpolable);
			if (num != -1)
			{
				this._selectedInterpolables.RemoveAt(num);
			}
			this._interpolablesTree.RemoveLeaf(interpolable);
			this._selectedKeyframes.RemoveAll((KeyValuePair<float, Keyframe> elem) => elem.Value.parent == interpolable);
			this.UpdateInterpolablesView();
			this.UpdateKeyframeWindow(false);
		}

		// Token: 0x0600006F RID: 111 RVA: 0x0000615C File Offset: 0x0000435C
		private void RemoveInterpolables(IEnumerable<Interpolable> interpolables)
		{
			if (interpolables == this._selectedInterpolables)
			{
				interpolables = interpolables.ToArray<Interpolable>();
			}
			using (IEnumerator<Interpolable> enumerator = interpolables.GetEnumerator())
			{
				while (enumerator.MoveNext())
				{
					Interpolable interpolable = enumerator.Current;
					if (this._interpolables.ContainsKey(interpolable.GetHashCode()))
					{
						this._interpolables.Remove(interpolable.GetHashCode());
					}
					this._interpolablesTree.RemoveLeaf(interpolable);
					int num = this._selectedInterpolables.IndexOf(interpolable);
					if (num != -1)
					{
						this._selectedInterpolables.RemoveAt(num);
					}
					this._selectedKeyframes.RemoveAll((KeyValuePair<float, Keyframe> elem) => elem.Value.parent == interpolable);
				}
			}
			this.UpdateInterpolablesView();
			this.UpdateKeyframeWindow(false);
		}

		// Token: 0x06000070 RID: 112 RVA: 0x00006258 File Offset: 0x00004458
		private void Init()
		{
			UIUtility.Init();
			BuiltInInterpolables.Populate();
			if (Camera.main.GetComponent<Expression>() == null)
			{
				Camera.main.gameObject.AddComponent<Expression>();
			}
			this._allGuideObjects = (Dictionary<Transform, GuideObject>)Singleton<GuideObjectManager>.Instance.GetPrivate("dicGuideObject");
			this._selectedGuideObjects = (HashSet<GuideObject>)Singleton<GuideObjectManager>.Instance.GetPrivate("hashSelectObject");
			AssetBundle assetBundle = AssetBundle.LoadFromMemory(Assembly.GetExecutingAssembly().GetResource("Timeline.Resources.TimelineResources.unity3d"));
			GameObject gameObject = assetBundle.LoadAsset<GameObject>("Canvas");
			this._ui = Object.Instantiate<GameObject>(gameObject).GetComponent<Canvas>();
			CanvasGroup alphaGroup = this._ui.GetComponent<CanvasGroup>();
			gameObject.hideFlags |= 1;
			this._keyframePrefab = assetBundle.LoadAsset<GameObject>("Keyframe");
			this._keyframePrefab.hideFlags |= 1;
			this._keyframesBackgroundMaterial = assetBundle.LoadAsset<Material>("KeyframesBackground");
			this._interpolablePrefab = assetBundle.LoadAsset<GameObject>("Interpolable");
			this._interpolablePrefab.hideFlags |= 1;
			this._interpolableModelPrefab = assetBundle.LoadAsset<GameObject>("InterpolableModel");
			this._interpolableModelPrefab.hideFlags |= 1;
			this._curveKeyframePrefab = assetBundle.LoadAsset<GameObject>("CurveKeyframe");
			this._curveKeyframePrefab.hideFlags |= 1;
			this._headerPrefab = assetBundle.LoadAsset<GameObject>("Header");
			this._headerPrefab.hideFlags |= 1;
			this._singleFilePrefab = assetBundle.LoadAsset<GameObject>("SingleFile");
			this._singleFilePrefab.hideFlags |= 1;
			this._ui.transform.Find("Timeline Window/Help Panel/Main Container/Scroll View/Viewport/Content/Text").GetComponent<Text>().text = Encoding.Default.GetString(Assembly.GetExecutingAssembly().GetResource("Timeline.Resources.Help.txt"));
			foreach (Sprite sprite in assetBundle.LoadAllAssets<Sprite>())
			{
				string name = sprite.name;
				if (name != null)
				{
					uint num = <PrivateImplementationDetails>.ComputeStringHash(name);
					if (num <= 2200802204U)
					{
						if (num <= 1448518325U)
						{
							if (num != 755256U)
							{
								if (num != 618647921U)
								{
									if (num == 1448518325U)
									{
										if (name == "AddToFolder")
										{
											this._addToFolderSprite = sprite;
										}
									}
								}
								else if (name == "NewFolder")
								{
									this._newFolderSprite = sprite;
								}
							}
							else if (name == "Checkbox")
							{
								this._checkboxSprite = sprite;
							}
						}
						else if (num != 1469573738U)
						{
							if (num != 1688447725U)
							{
								if (num == 2200802204U)
								{
									if (name == "SelectAll")
									{
										this._selectAllSprite = sprite;
									}
								}
							}
							else if (name == "ChevronUp")
							{
								this._chevronUpSprite = sprite;
							}
						}
						else if (name == "Delete")
						{
							this._deleteSprite = sprite;
						}
					}
					else if (num <= 2646845972U)
					{
						if (num != 2382947721U)
						{
							if (num != 2557575948U)
							{
								if (num == 2646845972U)
								{
									if (name == "Add")
									{
										this._addSprite = sprite;
									}
								}
							}
							else if (name == "ChevronDown")
							{
								this._chevronDownSprite = sprite;
							}
						}
						else if (name == "Link")
						{
							this._linkSprite = sprite;
						}
					}
					else if (num != 3355849203U)
					{
						if (num != 3562264635U)
						{
							if (num == 3853794552U)
							{
								if (name == "Color")
								{
									this._colorSprite = sprite;
								}
							}
						}
						else if (name == "CheckboxComposite")
						{
							this._checkboxCompositeSprite = sprite;
						}
					}
					else if (name == "Rename")
					{
						this._renameSprite = sprite;
					}
				}
			}
			assetBundle.Unload(false);
			this._tooltip = this._ui.transform.Find("Tooltip/Text").GetComponent<Text>();
			this._timelineWindow = (RectTransform)this._ui.transform.Find("Timeline Window");
			UIUtility.MakeObjectDraggable((RectTransform)this._ui.transform.Find("Timeline Window/Top Container"), this._timelineWindow, (RectTransform)this._ui.transform);
			this._helpPanel = this._ui.transform.Find("Timeline Window/Help Panel").gameObject;
			this._singleFilesPanel = this._ui.transform.Find("Timeline Window/Single Files Panel").gameObject;
			this._singleFilesContainer = (RectTransform)this._singleFilesPanel.transform.Find("Main Container/Scroll View/Viewport/Content");
			this._singleFileNameField = this._singleFilesPanel.transform.Find("Main Container/Buttons/Name").GetComponent<InputField>();
			this._verticalScrollView = this._ui.transform.Find("Timeline Window/Main Container/Timeline/Interpolables").GetComponent<ScrollRect>();
			this._horizontalScrollView = this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View").GetComponent<ScrollRect>();
			this._allToggle = this._ui.transform.Find("Timeline Window/Main Container/Timeline/Interpolables/Top/All").GetComponent<Toggle>();
			this._interpolablesSearchField = this._ui.transform.Find("Timeline Window/Main Container/Search").GetComponent<InputField>();
			this._grid = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container");
			this._gridImage = this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Grid/Viewport/Background").GetComponent<RawImage>();
			this._gridImage.material = new Material(this._gridImage.material);
			this._gridTop = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Texts/Background");
			this._cursor = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Cursor");
			this._frameRateInputField = this._ui.transform.Find("Timeline Window/Buttons/Play Buttons/FrameRate").GetComponent<InputField>();
			this._timeInputField = this._ui.transform.Find("Timeline Window/Buttons/Time").GetComponent<InputField>();
			this._blockLengthInputField = this._ui.transform.Find("Timeline Window/Buttons/Block Divisions/Block Length").GetComponent<InputField>();
			this._divisionsInputField = this._ui.transform.Find("Timeline Window/Buttons/Block Divisions/Divisions").GetComponent<InputField>();
			this._durationInputField = this._ui.transform.Find("Timeline Window/Buttons/Duration").GetComponent<InputField>();
			this._speedInputField = this._ui.transform.Find("Timeline Window/Buttons/Speed").GetComponent<InputField>();
			this._textsContainer = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Texts");
			this._keyframesContainer = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Grid/Viewport/Content");
			this._selectionArea = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Grid/Viewport/Content/Selection");
			this._miscContainer = (RectTransform)this._ui.transform.Find("Timeline Window/Main Container/Timeline/Scroll View/Viewport/Content/Grid Container/Grid/Viewport/Misc Content");
			this._resizeHandle = (RectTransform)this._ui.transform.Find("Timeline Window/Resize Handle");
			this._ui.transform.Find("Timeline Window/Buttons/Play Buttons/Play").GetComponent<Button>().onClick.AddListener(new UnityAction(Timeline.Play));
			this._ui.transform.Find("Timeline Window/Buttons/Play Buttons/Pause").GetComponent<Button>().onClick.AddListener(new UnityAction(Timeline.Pause));
			this._ui.transform.Find("Timeline Window/Buttons/Play Buttons/Stop").GetComponent<Button>().onClick.AddListener(new UnityAction(Timeline.Stop));
			this._ui.transform.Find("Timeline Window/Buttons/Play Buttons/PrevFrame").GetComponent<Button>().onClick.AddListener(new UnityAction(Timeline.PreviousFrame));
			this._ui.transform.Find("Timeline Window/Buttons/Play Buttons/NextFrame").GetComponent<Button>().onClick.AddListener(new UnityAction(Timeline.NextFrame));
			this._ui.transform.Find("Timeline Window/Buttons/Single Files").GetComponent<Button>().onClick.AddListener(new UnityAction(this.ToggleSingleFilesPanel));
			this._singleFileNameField.onValueChanged.AddListener(delegate(string s)
			{
				this.UpdateSingleFileSelection();
			});
			this._singleFilesPanel.transform.Find("Main Container/Buttons/Load").GetComponent<Button>().onClick.AddListener(new UnityAction(this.LoadSingleFile));
			this._singleFilesPanel.transform.Find("Main Container/Buttons/Save").GetComponent<Button>().onClick.AddListener(new UnityAction(this.SaveSingleFile));
			this._singleFilesPanel.transform.Find("Main Container/Buttons/Delete").GetComponent<Button>().onClick.AddListener(new UnityAction(this.DeleteSingleFile));
			this._ui.transform.Find("Timeline Window/Buttons/Help").GetComponent<Button>().onClick.AddListener(new UnityAction(this.ToggleHelp));
			this._frameRateInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateDesiredFrameRate));
			this._timeInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdatePlaybackTime));
			this._durationInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateDuration));
			this._blockLengthInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateBlockLength));
			this._blockLengthInputField.text = this._blockLength.ToString();
			this._divisionsInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateDivisions));
			this._divisionsInputField.text = this._divisions.ToString();
			this._speedInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateSpeed));
			this._keyframesContainer.gameObject.AddComponent<PointerDownHandler>().onPointerDown = new Action<PointerEventData>(this.OnKeyframeContainerMouseDown);
			this._gridTop.gameObject.AddComponent<PointerDownHandler>().onPointerDown = new Action<PointerEventData>(this.OnGridTopMouse);
			this._ui.transform.Find("Timeline Window/Top Container").gameObject.AddComponent<ScrollHandler>().onScroll = delegate(PointerEventData e)
			{
				if (Input.GetKey(306))
				{
					if (e.scrollDelta.y > 0f)
					{
						alphaGroup.alpha = Mathf.Min(alphaGroup.alpha + 0.05f, 1f);
					}
					else
					{
						alphaGroup.alpha = Mathf.Max(alphaGroup.alpha - 0.05f, 0.1f);
					}
					e.Reset();
				}
			};
			DragHandler dragHandler = this._gridTop.gameObject.AddComponent<DragHandler>();
			dragHandler.onDrag = delegate(PointerEventData e)
			{
				this._isPlaying = false;
				this._isDraggingCursor = true;
				this.OnGridTopMouse(e);
				e.Reset();
			};
			dragHandler.onEndDrag = delegate(PointerEventData e)
			{
				this._isDraggingCursor = false;
				this.OnGridTopMouse(e);
				e.Reset();
			};
			this._gridTop.gameObject.AddComponent<ScrollHandler>().onScroll = delegate(PointerEventData e)
			{
				if (e.scrollDelta.y > 0f)
				{
					this.ZoomIn();
				}
				else
				{
					this.ZoomOut();
				}
				e.Reset();
			};
			this._verticalScrollView.onValueChanged.AddListener(new UnityAction<Vector2>(this.ScrollKeyframes));
			this._keyframesContainer.gameObject.AddComponent<ScrollHandler>().onScroll = delegate(PointerEventData e)
			{
				if (Input.GetKey(306))
				{
					if (e.scrollDelta.y > 0f)
					{
						this.ZoomIn();
					}
					else
					{
						this.ZoomOut();
					}
					e.Reset();
					return;
				}
				if (Input.GetKey(308))
				{
					this.ScaleKeyframeSelection(e.scrollDelta.y);
					e.Reset();
					return;
				}
				if (!Input.GetKey(304))
				{
					this._verticalScrollView.OnScroll(e);
					e.Reset();
					return;
				}
				this._horizontalScrollView.OnScroll(e);
			};
			DragHandler dragHandler2 = this._keyframesContainer.gameObject.AddComponent<DragHandler>();
			dragHandler2.onInitializePotentialDrag = delegate(PointerEventData e)
			{
				this.PotentiallyBeginAreaSelect(e);
				e.Reset();
			};
			dragHandler2.onBeginDrag = delegate(PointerEventData e)
			{
				this.BeginAreaSelect(e);
				e.Reset();
			};
			dragHandler2.onDrag = delegate(PointerEventData e)
			{
				this.UpdateAreaSelect(e);
				e.Reset();
			};
			dragHandler2.onEndDrag = delegate(PointerEventData e)
			{
				this.EndAreaSelect(e);
				e.Reset();
			};
			this._allToggle.onValueChanged.AddListener(delegate(bool b)
			{
				this.UpdateInterpolablesView();
			});
			this._interpolablesSearchField.onValueChanged.AddListener(new UnityAction<string>(this.InterpolablesSearch));
			this._resizeHandle.gameObject.AddComponent<DragHandler>().onDrag = new Action<PointerEventData>(this.OnResizeWindow);
			this._keyframeWindow = this._ui.transform.Find("Keyframe Window").gameObject;
			UIUtility.MakeObjectDraggable((RectTransform)this._keyframeWindow.transform.Find("Top Container"), (RectTransform)this._keyframeWindow.transform, (RectTransform)this._ui.transform);
			this._keyframeInterpolableNameText = this._keyframeWindow.transform.Find("Main Container/Main Fields/Interpolable Name").GetComponent<Text>();
			this._keyframeSelectPrevButton = this._keyframeWindow.transform.Find("Main Container/Main Fields/Prev Next/Prev").GetComponent<Button>();
			this._keyframeSelectNextButton = this._keyframeWindow.transform.Find("Main Container/Main Fields/Prev Next/Next").GetComponent<Button>();
			this._keyframeTimeTextField = this._keyframeWindow.transform.Find("Main Container/Main Fields/Time/InputField").GetComponent<InputField>();
			this._keyframeUseCurrentTimeButton = this._keyframeWindow.transform.Find("Main Container/Main Fields/Use Current Time").GetComponent<Button>();
			this._keyframeValueText = this._keyframeWindow.transform.Find("Main Container/Main Fields/Value/Background/Text").GetComponent<Text>();
			this._keyframeUseCurrentValueButton = this._keyframeWindow.transform.Find("Main Container/Main Fields/Use Current").GetComponent<Button>();
			Button component = this._keyframeWindow.transform.Find("Main Container/Main Fields/Delete").GetComponent<Button>();
			this._keyframeDeleteButtonText = component.GetComponentInChildren<Text>();
			this._curveContainer = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Curve/Grid/Spline").GetComponent<RawImage>();
			this._curveContainer.material = new Material(this._curveContainer.material);
			this._curveTimeInputField = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point Time/InputField").GetComponent<InputField>();
			this._curveTimeSlider = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point Time/Slider").GetComponent<Slider>();
			this._curveValueInputField = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point Value/InputField").GetComponent<InputField>();
			this._curveValueSlider = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point Value/Slider").GetComponent<Slider>();
			this._curveInTangentInputField = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point InTangent/InputField").GetComponent<InputField>();
			this._curveInTangentSlider = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point InTangent/Slider").GetComponent<Slider>();
			this._curveOutTangentInputField = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point OutTangent/InputField").GetComponent<InputField>();
			this._curveOutTangentSlider = this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Curve Point OutTangent/Slider").GetComponent<Slider>();
			this._cursor2 = (RectTransform)this._ui.transform.Find("Keyframe Window/Main Container/Curve Fields/Curve/Grid/Cursor");
			this._keyframeWindow.transform.Find("Close").GetComponent<Button>().onClick.AddListener(new UnityAction(this.CloseKeyframeWindow));
			this._keyframeSelectPrevButton.onClick.AddListener(new UnityAction(this.SelectPreviousKeyframe));
			this._keyframeSelectNextButton.onClick.AddListener(new UnityAction(this.SelectNextKeyframe));
			this._keyframeUseCurrentTimeButton.onClick.AddListener(new UnityAction(this.UseCurrentTime));
			this._keyframeWindow.transform.Find("Main Container/Main Fields/Drag At Current Time").GetComponent<Button>().onClick.AddListener(new UnityAction(this.DragAtCurrentTime));
			this._keyframeUseCurrentValueButton.onClick.AddListener(new UnityAction(this.UseCurrentValue));
			component.onClick.AddListener(new UnityAction(this.DeleteSelectedKeyframes));
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Presets/Line").GetComponent<Button>().onClick.AddListener(delegate()
			{
				this.ApplyKeyframeCurvePreset(this._linePreset);
			});
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Presets/Top").GetComponent<Button>().onClick.AddListener(delegate()
			{
				this.ApplyKeyframeCurvePreset(this._topPreset);
			});
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Presets/Bottom").GetComponent<Button>().onClick.AddListener(delegate()
			{
				this.ApplyKeyframeCurvePreset(this._bottomPreset);
			});
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Presets/Hermite").GetComponent<Button>().onClick.AddListener(delegate()
			{
				this.ApplyKeyframeCurvePreset(this._hermitePreset);
			});
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Presets/Stairs").GetComponent<Button>().onClick.AddListener(delegate()
			{
				this.ApplyKeyframeCurvePreset(this._stairsPreset);
			});
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Buttons/Copy").GetComponent<Button>().onClick.AddListener(new UnityAction(this.CopyKeyframeCurve));
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Buttons/Paste").GetComponent<Button>().onClick.AddListener(new UnityAction(this.PasteKeyframeCurve));
			this._keyframeWindow.transform.Find("Main Container/Curve Fields/Fields/Buttons/Invert").GetComponent<Button>().onClick.AddListener(new UnityAction(this.InvertKeyframeCurve));
			this._keyframeTimeTextField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateSelectedKeyframeTime));
			this._curveContainer.gameObject.AddComponent<PointerDownHandler>().onPointerDown = new Action<PointerEventData>(this.OnCurveMouseDown);
			this._curveTimeInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateCurvePointTime));
			this._curveTimeSlider.onValueChanged.AddListener(new UnityAction<float>(this.UpdateCurvePointTime));
			this._curveValueInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateCurvePointValue));
			this._curveValueSlider.onValueChanged.AddListener(new UnityAction<float>(this.UpdateCurvePointValue));
			this._curveInTangentInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateCurvePointInTangent));
			this._curveInTangentSlider.onValueChanged.AddListener(new UnityAction<float>(this.UpdateCurvePointInTangent));
			this._curveOutTangentInputField.onEndEdit.AddListener(new UnityAction<string>(this.UpdateCurvePointOutTangent));
			this._curveOutTangentSlider.onValueChanged.AddListener(new UnityAction<float>(this.UpdateCurvePointOutTangent));
			this._ui.gameObject.SetActive(false);
			this._helpPanel.gameObject.SetActive(false);
			this._singleFilesPanel.gameObject.SetActive(false);
			this._keyframeWindow.gameObject.SetActive(false);
			this._tooltip.transform.parent.gameObject.SetActive(false);
			this.UpdateInterpolablesView();
			this._loaded = true;
		}

		// Token: 0x06000071 RID: 113 RVA: 0x000075A4 File Offset: 0x000057A4
		private void ScrollKeyframes(Vector2 arg0)
		{
			this._keyframesContainer.anchoredPosition = new Vector2(this._keyframesContainer.anchoredPosition.x, this._verticalScrollView.content.anchoredPosition.y);
			this._miscContainer.anchoredPosition = new Vector2(this._miscContainer.anchoredPosition.x, this._verticalScrollView.content.anchoredPosition.y);
		}

		// Token: 0x06000072 RID: 114 RVA: 0x00007620 File Offset: 0x00005820
		private void InterpolateBefore()
		{
			if (this._isPlaying)
			{
				this._playbackTime = (Time.time - this._startTime) % this._duration;
				this.UpdateCursor();
				this.Interpolate(true);
			}
		}

		// Token: 0x06000073 RID: 115 RVA: 0x00007654 File Offset: 0x00005854
		private void InterpolateAfter()
		{
			if (this._isPlaying)
			{
				this.Interpolate(false);
			}
		}

		// Token: 0x06000074 RID: 116 RVA: 0x00007668 File Offset: 0x00005868
		private void Interpolate(bool before)
		{
			this._interpolablesTree.Recurse(delegate(INode node, int depth)
			{
				if (node.type != INodeType.Leaf)
				{
					return;
				}
				Interpolable obj = ((LeafNode<Interpolable>)node).obj;
				if (!obj.enabled)
				{
					return;
				}
				if (before)
				{
					if (!obj.canInterpolateBefore)
					{
						return;
					}
				}
				else if (!obj.canInterpolateAfter)
				{
					return;
				}
				KeyValuePair<float, Keyframe> keyValuePair = default(KeyValuePair<float, Keyframe>);
				KeyValuePair<float, Keyframe> keyValuePair2 = default(KeyValuePair<float, Keyframe>);
				foreach (KeyValuePair<float, Keyframe> keyValuePair3 in obj.keyframes)
				{
					if (keyValuePair3.Key > this._playbackTime)
					{
						keyValuePair2 = keyValuePair3;
						break;
					}
					keyValuePair = keyValuePair3;
				}
				bool flag = true;
				if (keyValuePair.Value != null && keyValuePair2.Value != null)
				{
					float num = (this._playbackTime - keyValuePair.Key) / (keyValuePair2.Key - keyValuePair.Key);
					num = keyValuePair.Value.curve.Evaluate(num);
					if (before)
					{
						flag = obj.InterpolateBefore(keyValuePair.Value.value, keyValuePair2.Value.value, num);
					}
					else
					{
						flag = obj.InterpolateAfter(keyValuePair.Value.value, keyValuePair2.Value.value, num);
					}
				}
				else if (keyValuePair.Value != null)
				{
					if (before)
					{
						flag = obj.InterpolateBefore(keyValuePair.Value.value, keyValuePair.Value.value, 0f);
					}
					else
					{
						flag = obj.InterpolateAfter(keyValuePair.Value.value, keyValuePair.Value.value, 0f);
					}
				}
				else if (keyValuePair2.Value != null)
				{
					if (before)
					{
						flag = obj.InterpolateBefore(keyValuePair2.Value.value, keyValuePair2.Value.value, 0f);
					}
					else
					{
						flag = obj.InterpolateAfter(keyValuePair2.Value.value, keyValuePair2.Value.value, 0f);
					}
				}
				if (!flag)
				{
					this._toDelete.Add(obj);
				}
			});
		}

		// Token: 0x06000075 RID: 117 RVA: 0x000076A4 File Offset: 0x000058A4
		private float ParseTime(string timeString)
		{
			string[] array = timeString.Split(new char[]
			{
				':'
			});
			if (array.Length != 2)
			{
				return -1f;
			}
			int num;
			if (!int.TryParse(array[0], out num) || num < 0)
			{
				return -1f;
			}
			float num2;
			if (!float.TryParse(array[1], out num2))
			{
				return -1f;
			}
			return (float)(num * 60) + num2;
		}

		// Token: 0x06000076 RID: 118 RVA: 0x00007718 File Offset: 0x00005918
		private void UpdateCursor()
		{
			this._cursor.anchoredPosition = new Vector2(this._playbackTime * this._grid.rect.width / this._duration, this._cursor.anchoredPosition.y);
			this.UpdateCursor2();
			this._timeInputField.text = string.Format("{0:00}:{1:00.000}", Mathf.FloorToInt(this._playbackTime / 60f), this._playbackTime % 60f);
		}

		// Token: 0x06000077 RID: 119 RVA: 0x000077AC File Offset: 0x000059AC
		private void UpdateDesiredFrameRate(string s)
		{
			int num;
			if (int.TryParse(this._frameRateInputField.text, out num) && num >= 1)
			{
				this._desiredFrameRate = num;
			}
			this._frameRateInputField.text = this._desiredFrameRate.ToString();
		}

		// Token: 0x06000078 RID: 120 RVA: 0x000077F8 File Offset: 0x000059F8
		private void UpdatePlaybackTime(string s)
		{
			if (!this._isPlaying)
			{
				float num = this.ParseTime(this._timeInputField.text);
				if (num < 0f)
				{
					return;
				}
				this.SeekPlaybackTime(num % this._duration);
			}
		}

		// Token: 0x06000079 RID: 121 RVA: 0x00007840 File Offset: 0x00005A40
		private void UpdateDuration(string s)
		{
			float num = this.ParseTime(this._durationInputField.text);
			if (num < 0f)
			{
				return;
			}
			this._duration = num;
			this.UpdateGrid();
		}

		// Token: 0x0600007A RID: 122 RVA: 0x0000787C File Offset: 0x00005A7C
		private void UpdateBlockLength(string arg0)
		{
			float num;
			if (float.TryParse(this._blockLengthInputField.text, out num) && num >= 0.01f)
			{
				this._blockLength = num;
				this.UpdateGrid();
			}
			this._blockLengthInputField.text = this._blockLength.ToString();
		}

		// Token: 0x0600007B RID: 123 RVA: 0x000078D4 File Offset: 0x00005AD4
		private void UpdateDivisions(string arg0)
		{
			int num;
			if (int.TryParse(this._divisionsInputField.text, out num) && num >= 1)
			{
				this._divisions = num;
				this.UpdateGridMaterial();
			}
			this._divisionsInputField.text = this._divisions.ToString();
		}

		// Token: 0x0600007C RID: 124 RVA: 0x00007928 File Offset: 0x00005B28
		private void UpdateSpeed(string arg0)
		{
			float num;
			if (float.TryParse(this._speedInputField.text, out num) && num >= 0f)
			{
				Time.timeScale = num;
			}
		}

		// Token: 0x0600007D RID: 125 RVA: 0x00007964 File Offset: 0x00005B64
		private void ZoomOut()
		{
			this._zoomLevel -= 0.05f * this._zoomLevel;
			if (this._zoomLevel < 0.1f)
			{
				this._zoomLevel = 0.1f;
			}
			float horizontalNormalizedPosition = this._horizontalScrollView.horizontalNormalizedPosition;
			this.UpdateGrid();
			this._horizontalScrollView.horizontalNormalizedPosition = horizontalNormalizedPosition;
		}

		// Token: 0x0600007E RID: 126 RVA: 0x000079C8 File Offset: 0x00005BC8
		private void ZoomIn()
		{
			this._zoomLevel += 0.05f * this._zoomLevel;
			if (this._zoomLevel > 64f)
			{
				this._zoomLevel = 64f;
			}
			float horizontalNormalizedPosition = this._horizontalScrollView.horizontalNormalizedPosition;
			this.UpdateGrid();
			this._horizontalScrollView.horizontalNormalizedPosition = horizontalNormalizedPosition;
		}

		// Token: 0x0600007F RID: 127 RVA: 0x00007A2C File Offset: 0x00005C2C
		private void ToggleHelp()
		{
			this._helpPanel.gameObject.SetActive(!this._helpPanel.gameObject.activeSelf);
		}

		// Token: 0x06000080 RID: 128 RVA: 0x00007A60 File Offset: 0x00005C60
		private void InterpolablesSearch(string arg0)
		{
			this.UpdateInterpolablesView();
		}

		// Token: 0x06000081 RID: 129 RVA: 0x00007A68 File Offset: 0x00005C68
		private void UpdateInterpolablesView()
		{
			bool isOn = this._allToggle.isOn;
			int i = 0;
			int num = 0;
			this._gridHeights.Clear();
			float num2 = 0f;
			this.UpdateInterpolablesViewTree(this._interpolablesTree.tree, isOn, ref i, ref num, ref num2, 0);
			int j = 0;
			using (IEnumerator<KeyValuePair<string, List<InterpolableModel>>> enumerator = this._interpolableModelsDictionary.OrderBy(delegate(KeyValuePair<string, List<InterpolableModel>> p)
			{
				int result;
				if (!this._hardCodedOwnerOrder.TryGetValue(p.Key, out result))
				{
					return int.MaxValue;
				}
				return result;
			}).GetEnumerator())
			{
				while (enumerator.MoveNext())
				{
					KeyValuePair<string, List<InterpolableModel>> keyValuePair = enumerator.Current;
					Timeline.HeaderDisplay headerDisplay = this.GetHeaderDisplay(num, false);
					headerDisplay.gameObject.transform.SetAsLastSibling();
					headerDisplay.container.offsetMin = Vector2.zero;
					headerDisplay.group = null;
					headerDisplay.name.text = keyValuePair.Key;
					num2 += 32f;
					this._gridHeights.Add(num2);
					if (headerDisplay.expanded)
					{
						foreach (InterpolableModel interpolableModel in keyValuePair.Value)
						{
							if (interpolableModel.IsCompatibleWithTarget(this._selectedOCI) && interpolableModel.name.IndexOf(this._interpolablesSearchField.text, StringComparison.OrdinalIgnoreCase) != -1)
							{
								Timeline.InterpolableModelDisplay interpolableModelDisplay = this.GetInterpolableModelDisplay(j);
								interpolableModelDisplay.gameObject.transform.SetAsLastSibling();
								interpolableModelDisplay.model = interpolableModel;
								interpolableModelDisplay.name.text = interpolableModel.name;
								num2 += 32f;
								this._gridHeights.Add(num2);
								j++;
							}
						}
					}
					num++;
				}
				goto IL_1BD;
			}
			IL_1A2:
			this._displayedOwnerHeader[num].gameObject.SetActive(false);
			num++;
			IL_1BD:
			if (num >= this._displayedOwnerHeader.Count)
			{
				while (i < this._displayedInterpolables.Count)
				{
					Timeline.InterpolableDisplay interpolableDisplay = this._displayedInterpolables[i];
					interpolableDisplay.gameObject.SetActive(false);
					interpolableDisplay.gridBackground.gameObject.SetActive(false);
					i++;
				}
				while (j < this._displayedInterpolableModels.Count)
				{
					this._displayedInterpolableModels[j].gameObject.SetActive(false);
					j++;
				}
				this.UpdateInterpolableSelection();
				this.ExecuteDelayed(new Action(this.UpdateGrid), 1);
				this.ExecuteDelayed(new Action(this.UpdateSeparators), 2);
				return;
			}
			goto IL_1A2;
		}

		// Token: 0x06000082 RID: 130 RVA: 0x00007D14 File Offset: 0x00005F14
		private void UpdateInterpolablesViewTree(List<INode> nodes, bool showAll, ref int interpolableDisplayIndex, ref int headerDisplayIndex, ref float height, int indent = 0)
		{
			Func<LeafNode<Interpolable>, bool> <>9__1;
			foreach (INode node in nodes)
			{
				INodeType type = node.type;
				if (type != INodeType.Leaf)
				{
					if (type == INodeType.Group)
					{
						GroupNode<Timeline.InterpolableGroup> groupNode = (GroupNode<Timeline.InterpolableGroup>)node;
						Tree<Interpolable, Timeline.InterpolableGroup> interpolablesTree = this._interpolablesTree;
						GroupNode<Timeline.InterpolableGroup> group = groupNode;
						Func<LeafNode<Interpolable>, bool> predicate;
						if ((predicate = <>9__1) == null)
						{
							predicate = (<>9__1 = ((LeafNode<Interpolable> leafNode) => this.ShouldShowInterpolable(leafNode.obj, showAll)));
						}
						if (interpolablesTree.Any(group, predicate))
						{
							Timeline.HeaderDisplay headerDisplay = this.GetHeaderDisplay(headerDisplayIndex, true);
							headerDisplay.gameObject.transform.SetAsLastSibling();
							headerDisplay.container.offsetMin = new Vector2((float)indent, 0f);
							headerDisplay.group = (GroupNode<Timeline.InterpolableGroup>)node;
							headerDisplay.name.text = groupNode.obj.name;
							height += 21.333334f;
							this._gridHeights.Add(height);
							headerDisplayIndex++;
							if (groupNode.obj.expanded)
							{
								this.UpdateInterpolablesViewTree(((GroupNode<Timeline.InterpolableGroup>)node).children, showAll, ref interpolableDisplayIndex, ref headerDisplayIndex, ref height, indent + 8);
							}
						}
					}
				}
				else
				{
					Interpolable interpolable = ((LeafNode<Interpolable>)node).obj;
					if (this.ShouldShowInterpolable(interpolable, showAll))
					{
						Timeline.InterpolableDisplay display = this.GetInterpolableDisplay(interpolableDisplayIndex);
						display.gameObject.transform.SetAsLastSibling();
						display.container.offsetMin = new Vector2((float)indent, 0f);
						display.interpolable = (LeafNode<Interpolable>)node;
						display.group.alpha = ((!interpolable.useOciInHash || (interpolable.oci != null && interpolable.oci == this._selectedOCI)) ? 1f : 0.75f);
						display.enabled.onValueChanged = new Toggle.ToggleEvent();
						display.enabled.isOn = interpolable.enabled;
						display.enabled.onValueChanged.AddListener(delegate(bool b)
						{
							interpolable.enabled = display.enabled.isOn;
						});
						if (string.IsNullOrEmpty(interpolable.alias))
						{
							if (showAll && interpolable.oci != null && interpolable.parameter != interpolable.oci.guideObject)
							{
								display.name.text = interpolable.name + " (" + interpolable.oci.guideObject.transformTarget.name + ")";
							}
							else
							{
								display.name.text = interpolable.name;
							}
						}
						else
						{
							display.name.text = interpolable.alias;
						}
						display.gridBackground.gameObject.SetActive(true);
						display.gridBackground.rectTransform.SetRect(new Vector2(0f, 1f), Vector2.one, new Vector2(0f, -height - 32f), new Vector2(0f, -height));
						this.UpdateInterpolableColor(display, interpolable.color);
						height += 32f;
						this._gridHeights.Add(height);
						interpolableDisplayIndex++;
					}
				}
			}
		}

		// Token: 0x06000083 RID: 131 RVA: 0x0000811C File Offset: 0x0000631C
		private bool ShouldShowInterpolable(Interpolable interpolable, bool showAll)
		{
			return (showAll || ((interpolable.oci == null || interpolable.oci == this._selectedOCI) && interpolable.ShouldShow())) && interpolable.name.IndexOf(this._interpolablesSearchField.text, StringComparison.OrdinalIgnoreCase) != -1;
		}

		// Token: 0x06000084 RID: 132 RVA: 0x0000817C File Offset: 0x0000637C
		private void UpdateInterpolableColor(Timeline.InterpolableDisplay display, Color c)
		{
			display.background.color = c;
			display.name.color = c.GetContrastingColor();
			display.gridBackground.color = new Color(c.r, c.g, c.b, 0.825f);
		}

		// Token: 0x06000085 RID: 133 RVA: 0x000081D4 File Offset: 0x000063D4
		private void UpdateSeparators()
		{
			int num = 0;
			using (List<float>.Enumerator enumerator = this._gridHeights.GetEnumerator())
			{
				while (enumerator.MoveNext())
				{
					float num2 = enumerator.Current;
					RawImage rawImage;
					if (num < this._interpolableSeparators.Count)
					{
						rawImage = this._interpolableSeparators[num];
					}
					else
					{
						rawImage = UIUtility.CreateRawImage("Separator", this._miscContainer, null);
						rawImage.color = new Color(0f, 0f, 0f, 0.5f);
						this._interpolableSeparators.Add(rawImage);
					}
					rawImage.gameObject.SetActive(true);
					rawImage.rectTransform.SetRect(new Vector2(0f, 1f), Vector2.one, new Vector2(0f, -num2 - 1.5f), new Vector2(0f, -num2 + 1.5f));
					num++;
				}
				goto IL_108;
			}
			IL_ED:
			this._interpolableSeparators[num].gameObject.SetActive(false);
			num++;
			IL_108:
			if (num >= this._interpolableSeparators.Count)
			{
				return;
			}
			goto IL_ED;
		}

		// Token: 0x06000086 RID: 134 RVA: 0x00008308 File Offset: 0x00006508
		private Timeline.InterpolableDisplay GetInterpolableDisplay(int i)
		{
			Timeline.InterpolableDisplay display;
			if (i < this._displayedInterpolables.Count)
			{
				display = this._displayedInterpolables[i];
			}
			else
			{
				display = new Timeline.InterpolableDisplay();
				display.gameObject = Object.Instantiate<GameObject>(this._interpolablePrefab);
				display.gameObject.hideFlags = 0;
				display.group = display.gameObject.GetComponent<CanvasGroup>();
				display.container = (RectTransform)display.gameObject.transform.Find("Container");
				display.enabled = display.container.Find("Enabled").GetComponent<Toggle>();
				display.name = display.container.Find("Label").GetComponent<Text>();
				display.inputField = display.container.Find("InputField").GetComponent<InputField>();
				display.background = display.container.GetComponent<Image>();
				display.selectedOutline = display.container.Find("SelectedOutline").GetComponent<Image>();
				display.gridBackground = UIUtility.CreateRawImage(string.Format("Interpolable{0} Background", i), this._miscContainer, null);
				display.background.material = new Material(display.background.material);
				display.gameObject.transform.SetParent(this._verticalScrollView.content);
				display.gameObject.transform.localPosition = Vector3.zero;
				display.gameObject.transform.localScale = Vector3.one;
				display.gridBackground.transform.SetAsFirstSibling();
				display.gridBackground.raycastTarget = false;
				display.gridBackground.material = new Material(this._keyframesBackgroundMaterial);
				display.inputField.gameObject.SetActive(false);
				Func<Interpolable, INode> <>9__5;
				Func<Interpolable, INode> <>9__22;
				Func<Interpolable, INode> <>9__24;
				display.container.gameObject.AddComponent<PointerDownHandler>().onPointerDown = delegate(PointerEventData e)
				{
					Interpolable obj = display.interpolable.obj;
					switch (e.button)
					{
					case 0:
						if (Input.GetKey(306) || Input.GetKey(305))
						{
							this.SelectAddInterpolable(new Interpolable[]
							{
								obj
							});
							return;
						}
						if (Input.GetKey(304) || Input.GetKey(303))
						{
							Interpolable lastSelected = this._selectedInterpolables.LastOrDefault<Interpolable>();
							if (lastSelected != null)
							{
								Interpolable selectingNow = obj;
								int selectingNowIndex = this._displayedInterpolables.FindIndex((Timeline.InterpolableDisplay elem) => elem.interpolable.obj == selectingNow);
								int lastSelectedIndex = this._displayedInterpolables.FindIndex((Timeline.InterpolableDisplay elem) => elem.interpolable.obj == lastSelected);
								if (selectingNowIndex < lastSelectedIndex)
								{
									int selectingNowIndex2 = selectingNowIndex;
									selectingNowIndex = lastSelectedIndex;
									lastSelectedIndex = selectingNowIndex2;
								}
								this.SelectAddInterpolable((from elem in this._displayedInterpolables.Where((Timeline.InterpolableDisplay elem, int index) => index > lastSelectedIndex && index < selectingNowIndex)
								select elem.interpolable.obj).ToArray<Interpolable>());
								this.SelectAddInterpolable(new Interpolable[]
								{
									selectingNow
								});
								return;
							}
							this.SelectAddInterpolable(new Interpolable[]
							{
								obj
							});
							return;
						}
						else
						{
							if (!Input.GetKey(308))
							{
								this.SelectInterpolable(new Interpolable[]
								{
									obj
								});
								return;
							}
							GuideObject guideObject = obj.parameter as GuideObject;
							if (guideObject == null && obj.oci != null)
							{
								guideObject = obj.oci.guideObject;
							}
							if (guideObject != null)
							{
								Singleton<GuideObjectManager>.Instance.selectObject = guideObject;
								return;
							}
						}
						break;
					case 1:
					{
						Vector2 anchoredPosition;
						if (RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)this._ui.transform, e.position, e.pressEventCamera, ref anchoredPosition))
						{
							if (this._selectedInterpolables.Count == 0 || !this._selectedInterpolables.Contains(obj))
							{
								this.SelectInterpolable(new Interpolable[]
								{
									obj
								});
							}
							List<Interpolable> currentlySelectedInterpolables = new List<Interpolable>(this._selectedInterpolables);
							List<AContextMenuElement> list = new List<AContextMenuElement>();
							if (currentlySelectedInterpolables.Count == 1)
							{
								Interpolable selectedInterpolable = currentlySelectedInterpolables[0];
								GuideObject linkedGuideObject = selectedInterpolable.parameter as GuideObject;
								if (linkedGuideObject == null && selectedInterpolable.oci != null)
								{
									linkedGuideObject = selectedInterpolable.oci.guideObject;
								}
								if (linkedGuideObject != null)
								{
									list.Add(new LeafElement
									{
										icon = this._linkSprite,
										text = "Select linked GuideObject",
										onClick = delegate(object p)
										{
											Singleton<GuideObjectManager>.Instance.selectObject = linkedGuideObject;
										}
									});
								}
								UnityAction<string> <>9__8;
								list.Add(new LeafElement
								{
									icon = this._renameSprite,
									text = "Rename",
									onClick = delegate(object p)
									{
										display.inputField.gameObject.SetActive(true);
										display.inputField.onEndEdit = new InputField.SubmitEvent();
										display.inputField.text = (string.IsNullOrEmpty(selectedInterpolable.alias) ? selectedInterpolable.name : selectedInterpolable.alias);
										UnityEvent<string> onEndEdit = display.inputField.onEndEdit;
										UnityAction<string> unityAction;
										if ((unityAction = <>9__8) == null)
										{
											unityAction = (<>9__8 = delegate(string s)
											{
												selectedInterpolable.alias = display.inputField.text.Trim();
												display.inputField.gameObject.SetActive(false);
												this.UpdateInterpolablesView();
											});
										}
										onEndEdit.AddListener(unityAction);
										display.inputField.ActivateInputField();
										display.inputField.Select();
									}
								});
							}
							else
							{
								list.Add(new LeafElement
								{
									icon = this._newFolderSprite,
									text = "Group together",
									onClick = delegate(object p)
									{
										this._interpolablesTree.GroupTogether(currentlySelectedInterpolables, new Timeline.InterpolableGroup
										{
											name = "New Group"
										});
										this.UpdateInterpolablesView();
									}
								});
							}
							list.Add(new LeafElement
							{
								icon = this._selectAllSprite,
								text = "Select keyframes",
								onClick = delegate(object p)
								{
									List<KeyValuePair<float, Keyframe>> list2 = new List<KeyValuePair<float, Keyframe>>();
									foreach (Interpolable interpolable in currentlySelectedInterpolables)
									{
										list2.AddRange(interpolable.keyframes);
									}
									this.SelectKeyframes(list2);
								}
							});
							list.Add(new LeafElement
							{
								icon = this._selectAllSprite,
								text = "Select keyframes before cursor",
								onClick = delegate(object p)
								{
									List<KeyValuePair<float, Keyframe>> list2 = new List<KeyValuePair<float, Keyframe>>();
									float currentTime = this._playbackTime % this._duration;
									Func<KeyValuePair<float, Keyframe>, bool> <>9__12;
									foreach (Interpolable interpolable in currentlySelectedInterpolables)
									{
										List<KeyValuePair<float, Keyframe>> list3 = list2;
										IEnumerable<KeyValuePair<float, Keyframe>> keyframes = interpolable.keyframes;
										Func<KeyValuePair<float, Keyframe>, bool> predicate;
										if ((predicate = <>9__12) == null)
										{
											predicate = (<>9__12 = ((KeyValuePair<float, Keyframe> k) => k.Key < currentTime));
										}
										list3.AddRange(keyframes.Where(predicate));
									}
									this.SelectKeyframes(list2);
								}
							});
							list.Add(new LeafElement
							{
								icon = this._selectAllSprite,
								text = "Select keyframes after cursor",
								onClick = delegate(object p)
								{
									List<KeyValuePair<float, Keyframe>> list2 = new List<KeyValuePair<float, Keyframe>>();
									float currentTime = this._playbackTime % this._duration;
									Func<KeyValuePair<float, Keyframe>, bool> <>9__14;
									foreach (Interpolable interpolable in currentlySelectedInterpolables)
									{
										List<KeyValuePair<float, Keyframe>> list3 = list2;
										IEnumerable<KeyValuePair<float, Keyframe>> keyframes = interpolable.keyframes;
										Func<KeyValuePair<float, Keyframe>, bool> predicate;
										if ((predicate = <>9__14) == null)
										{
											predicate = (<>9__14 = ((KeyValuePair<float, Keyframe> k) => k.Key >= currentTime));
										}
										list3.AddRange(keyframes.Where(predicate));
									}
									this.SelectKeyframes(list2);
								}
							});
							UI_ColorInfo.UpdateColor <>9__16;
							list.Add(new LeafElement
							{
								icon = this._colorSprite,
								text = "Color",
								onClick = delegate(object p)
								{
									Singleton<Studio>.Instance.colorPaletteCtrl.visible = true;
									Singleton<Studio>.Instance.colorMenu.updateColorFunc = null;
									if (currentlySelectedInterpolables.Count == 1)
									{
										Singleton<Studio>.Instance.colorMenu.SetColor(currentlySelectedInterpolables[0].color, 0);
									}
									UI_ColorInfo colorMenu = Singleton<Studio>.Instance.colorMenu;
									UI_ColorInfo.UpdateColor updateColorFunc;
									if ((updateColorFunc = <>9__16) == null)
									{
										updateColorFunc = (<>9__16 = delegate(Color col)
										{
											using (List<Interpolable>.Enumerator enumerator = currentlySelectedInterpolables.GetEnumerator())
											{
												while (enumerator.MoveNext())
												{
													Interpolable interp = enumerator.Current;
													Timeline.InterpolableDisplay display = this._displayedInterpolables.Find((Timeline.InterpolableDisplay id) => id.interpolable.obj == interp);
													interp.color = col;
													this.UpdateInterpolableColor(display, col);
												}
											}
										});
									}
									colorMenu.updateColorFunc = updateColorFunc;
								}
							});
							list.Add(new LeafElement
							{
								icon = this._addSprite,
								text = ((currentlySelectedInterpolables.Count == 1) ? "Add keyframe at cursor" : "Add keyframes at cursor"),
								onClick = delegate(object p)
								{
									float time = this._playbackTime % this._duration;
									foreach (Interpolable interpolable in currentlySelectedInterpolables)
									{
										this.AddKeyframe(interpolable, time);
									}
									this.UpdateGrid();
								}
							});
							Timeline <>4__this = this;
							IEnumerable<Interpolable> currentlySelectedInterpolables3 = currentlySelectedInterpolables;
							Func<Interpolable, INode> selector;
							if ((selector = <>9__5) == null)
							{
								selector = (<>9__5 = ((Interpolable elem) => this._interpolablesTree.GetLeafNode(elem)));
							}
							List<AContextMenuElement> interpolablesTreeGroups = <>4__this.GetInterpolablesTreeGroups(currentlySelectedInterpolables3.Select(selector));
							if (interpolablesTreeGroups.Count != 1)
							{
								list.Add(new GroupElement
								{
									icon = this._addToFolderSprite,
									text = "Parent to",
									elements = interpolablesTreeGroups
								});
							}
							list.Add(new LeafElement
							{
								icon = this._checkboxSprite,
								text = ((currentlySelectedInterpolables.Count == 1) ? "Disable" : "Disable all"),
								onClick = delegate(object p)
								{
									foreach (Interpolable interpolable in currentlySelectedInterpolables)
									{
										interpolable.enabled = false;
									}
									this.UpdateInterpolablesView();
								}
							});
							list.Add(new LeafElement
							{
								icon = this._checkboxCompositeSprite,
								text = ((currentlySelectedInterpolables.Count == 1) ? "Enable" : "Enable all"),
								onClick = delegate(object p)
								{
									foreach (Interpolable interpolable in currentlySelectedInterpolables)
									{
										interpolable.enabled = true;
									}
									this.UpdateInterpolablesView();
								}
							});
							list.Add(new LeafElement
							{
								icon = this._chevronUpSprite,
								text = "Move up",
								onClick = delegate(object p)
								{
									Tree<Interpolable, Timeline.InterpolableGroup> interpolablesTree = this._interpolablesTree;
									IEnumerable<Interpolable> currentlySelectedInterpolables2 = currentlySelectedInterpolables;
									Func<Interpolable, INode> selector2;
									if ((selector2 = <>9__22) == null)
									{
										selector2 = (<>9__22 = ((Interpolable elem) => this._interpolablesTree.GetLeafNode(elem)));
									}
									interpolablesTree.MoveUp(currentlySelectedInterpolables2.Select(selector2));
									this.UpdateInterpolablesView();
								}
							});
							list.Add(new LeafElement
							{
								icon = this._chevronDownSprite,
								text = "Move down",
								onClick = delegate(object p)
								{
									Tree<Interpolable, Timeline.InterpolableGroup> interpolablesTree = this._interpolablesTree;
									IEnumerable<Interpolable> currentlySelectedInterpolables2 = currentlySelectedInterpolables;
									Func<Interpolable, INode> selector2;
									if ((selector2 = <>9__24) == null)
									{
										selector2 = (<>9__24 = ((Interpolable elem) => this._interpolablesTree.GetLeafNode(elem)));
									}
									interpolablesTree.MoveDown(currentlySelectedInterpolables2.Select(selector2));
									this.UpdateInterpolablesView();
								}
							});
							Action<bool> <>9__26;
							list.Add(new LeafElement
							{
								icon = this._deleteSprite,
								text = "Delete",
								onClick = delegate(object p)
								{
									string message = (currentlySelectedInterpolables.Count > 1) ? "Are you sure you want to delete these Interpolables?" : "Are you sure you want to delete this Interpolable?";
									Action<bool> callback;
									if ((callback = <>9__26) == null)
									{
										callback = (<>9__26 = delegate(bool result)
										{
											if (result)
											{
												this.RemoveInterpolables(currentlySelectedInterpolables);
											}
										});
									}
									UIUtility.DisplayConfirmationDialog(callback, message);
								}
							});
							UIUtility.ShowContextMenu(this._ui, anchoredPosition, list, 220f);
						}
						break;
					}
					case 2:
						if (Input.GetKey(306))
						{
							this.RemoveInterpolable(obj);
							return;
						}
						break;
					default:
						return;
					}
				};
				this._displayedInterpolables.Add(display);
			}
			display.gameObject.SetActive(true);
			return display;
		}

		// Token: 0x06000087 RID: 135 RVA: 0x000085BC File Offset: 0x000067BC
		private Timeline.InterpolableModelDisplay GetInterpolableModelDisplay(int i)
		{
			Timeline.InterpolableModelDisplay interpolableModelDisplay;
			if (i < this._displayedInterpolableModels.Count)
			{
				interpolableModelDisplay = this._displayedInterpolableModels[i];
			}
			else
			{
				interpolableModelDisplay = new Timeline.InterpolableModelDisplay();
				interpolableModelDisplay.gameObject = Object.Instantiate<GameObject>(this._interpolableModelPrefab);
				interpolableModelDisplay.gameObject.hideFlags = 0;
				interpolableModelDisplay.name = interpolableModelDisplay.gameObject.transform.Find("Label").GetComponent<Text>();
				interpolableModelDisplay.gameObject.transform.SetParent(this._verticalScrollView.content);
				interpolableModelDisplay.gameObject.transform.localPosition = Vector3.zero;
				interpolableModelDisplay.gameObject.transform.localScale = Vector3.one;
				this._displayedInterpolableModels.Add(interpolableModelDisplay);
			}
			interpolableModelDisplay.gameObject.SetActive(true);
			return interpolableModelDisplay;
		}

		// Token: 0x06000088 RID: 136 RVA: 0x00008694 File Offset: 0x00006894
		private Timeline.HeaderDisplay GetHeaderDisplay(int i, bool treeHeader = false)
		{
			Timeline.HeaderDisplay display;
			if (i < this._displayedOwnerHeader.Count)
			{
				display = this._displayedOwnerHeader[i];
			}
			else
			{
				display = new Timeline.HeaderDisplay();
				display.gameObject = Object.Instantiate<GameObject>(this._headerPrefab);
				display.gameObject.hideFlags = 0;
				display.layoutElement = display.gameObject.GetComponent<LayoutElement>();
				display.container = (RectTransform)display.gameObject.transform.Find("Container");
				display.name = display.container.Find("Text").GetComponent<Text>();
				display.inputField = display.container.Find("InputField").GetComponent<InputField>();
				display.gameObject.transform.SetParent(this._verticalScrollView.content);
				display.gameObject.transform.localPosition = Vector3.zero;
				display.gameObject.transform.localScale = Vector3.one;
				display.inputField.gameObject.SetActive(false);
				UnityAction<string> <>9__3;
				Action<object> <>9__2;
				Action<object> <>9__4;
				Action<object> <>9__6;
				Action<object> <>9__8;
				Action<object> <>9__11;
				Action<object> <>9__14;
				Action<object> <>9__16;
				Action<object> <>9__18;
				Action<object> <>9__20;
				Action<object> <>9__21;
				Action<bool> <>9__23;
				Action<object> <>9__22;
				display.container.gameObject.AddComponent<PointerDownHandler>().onPointerDown = delegate(PointerEventData e)
				{
					switch (e.button)
					{
					case 0:
						if (display.group != null)
						{
							display.group.obj.expanded = !display.group.obj.expanded;
						}
						else
						{
							display.expanded = !display.expanded;
						}
						this.UpdateInterpolablesView();
						return;
					case 1:
					{
						Vector2 anchoredPosition;
						if (display.group != null && RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)this._ui.transform, e.position, e.pressEventCamera, ref anchoredPosition))
						{
							if (this._selectedInterpolables.Count != 0)
							{
								this.ClearSelectedInterpolables();
							}
							List<AContextMenuElement> list = new List<AContextMenuElement>();
							List<AContextMenuElement> list2 = list;
							LeafElement leafElement = new LeafElement();
							leafElement.icon = this._renameSprite;
							leafElement.text = "Rename";
							Action<object> onClick;
							if ((onClick = <>9__2) == null)
							{
								onClick = (<>9__2 = delegate(object p)
								{
									display.inputField.gameObject.SetActive(true);
									display.inputField.onEndEdit = new InputField.SubmitEvent();
									display.inputField.text = display.group.obj.name;
									UnityEvent<string> onEndEdit = display.inputField.onEndEdit;
									UnityAction<string> unityAction;
									if ((unityAction = <>9__3) == null)
									{
										unityAction = (<>9__3 = delegate(string s)
										{
											string text = display.inputField.text.Trim();
											if (text.Length != 0)
											{
												display.group.obj.name = text;
											}
											display.inputField.gameObject.SetActive(false);
											this.UpdateInterpolablesView();
										});
									}
									onEndEdit.AddListener(unityAction);
									display.inputField.ActivateInputField();
									display.inputField.Select();
								});
							}
							leafElement.onClick = onClick;
							list2.Add(leafElement);
							List<AContextMenuElement> list3 = list;
							LeafElement leafElement2 = new LeafElement();
							leafElement2.icon = this._selectAllSprite;
							leafElement2.text = "Select Interpolables under";
							Action<object> onClick2;
							if ((onClick2 = <>9__4) == null)
							{
								onClick2 = (<>9__4 = delegate(object p)
								{
									List<Interpolable> toSelect = new List<Interpolable>();
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											toSelect.Add(((LeafNode<Interpolable>)n).obj);
										}
									});
									this.SelectInterpolable(toSelect.ToArray());
								});
							}
							leafElement2.onClick = onClick2;
							list3.Add(leafElement2);
							List<AContextMenuElement> list4 = list;
							LeafElement leafElement3 = new LeafElement();
							leafElement3.icon = this._selectAllSprite;
							leafElement3.text = "Select keyframes";
							Action<object> onClick3;
							if ((onClick3 = <>9__6) == null)
							{
								onClick3 = (<>9__6 = delegate(object p)
								{
									List<KeyValuePair<float, Keyframe>> toSelect = new List<KeyValuePair<float, Keyframe>>();
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											toSelect.AddRange(((LeafNode<Interpolable>)n).obj.keyframes);
										}
									});
									this.SelectKeyframes(toSelect);
								});
							}
							leafElement3.onClick = onClick3;
							list4.Add(leafElement3);
							List<AContextMenuElement> list5 = list;
							LeafElement leafElement4 = new LeafElement();
							leafElement4.icon = this._selectAllSprite;
							leafElement4.text = "Select keyframes before cursor";
							Action<object> onClick4;
							if ((onClick4 = <>9__8) == null)
							{
								onClick4 = (<>9__8 = delegate(object p)
								{
									List<KeyValuePair<float, Keyframe>> toSelect = new List<KeyValuePair<float, Keyframe>>();
									float currentTime = this._playbackTime % this._duration;
									Func<KeyValuePair<float, Keyframe>, bool> <>9__10;
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											List<KeyValuePair<float, Keyframe>> toSelect = toSelect;
											IEnumerable<KeyValuePair<float, Keyframe>> keyframes = ((LeafNode<Interpolable>)n).obj.keyframes;
											Func<KeyValuePair<float, Keyframe>, bool> predicate;
											if ((predicate = <>9__10) == null)
											{
												predicate = (<>9__10 = ((KeyValuePair<float, Keyframe> k) => k.Key < currentTime));
											}
											toSelect.AddRange(keyframes.Where(predicate));
										}
									});
									this.SelectKeyframes(toSelect);
								});
							}
							leafElement4.onClick = onClick4;
							list5.Add(leafElement4);
							List<AContextMenuElement> list6 = list;
							LeafElement leafElement5 = new LeafElement();
							leafElement5.icon = this._selectAllSprite;
							leafElement5.text = "Select keyframes after cursor";
							Action<object> onClick5;
							if ((onClick5 = <>9__11) == null)
							{
								onClick5 = (<>9__11 = delegate(object p)
								{
									List<KeyValuePair<float, Keyframe>> toSelect = new List<KeyValuePair<float, Keyframe>>();
									float currentTime = this._playbackTime % this._duration;
									Func<KeyValuePair<float, Keyframe>, bool> <>9__13;
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											List<KeyValuePair<float, Keyframe>> toSelect = toSelect;
											IEnumerable<KeyValuePair<float, Keyframe>> keyframes = ((LeafNode<Interpolable>)n).obj.keyframes;
											Func<KeyValuePair<float, Keyframe>, bool> predicate;
											if ((predicate = <>9__13) == null)
											{
												predicate = (<>9__13 = ((KeyValuePair<float, Keyframe> k) => k.Key >= currentTime));
											}
											toSelect.AddRange(keyframes.Where(predicate));
										}
									});
									this.SelectKeyframes(toSelect);
								});
							}
							leafElement5.onClick = onClick5;
							list6.Add(leafElement5);
							List<AContextMenuElement> list7 = list;
							LeafElement leafElement6 = new LeafElement();
							leafElement6.icon = this._addSprite;
							leafElement6.text = "Add keyframes at cursor";
							Action<object> onClick6;
							if ((onClick6 = <>9__14) == null)
							{
								onClick6 = (<>9__14 = delegate(object p)
								{
									float time = this._playbackTime % this._duration;
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											this.AddKeyframe(((LeafNode<Interpolable>)n).obj, time);
										}
									});
									this.UpdateGrid();
								});
							}
							leafElement6.onClick = onClick6;
							list7.Add(leafElement6);
							List<AContextMenuElement> interpolablesTreeGroups = this.GetInterpolablesTreeGroups(new List<INode>
							{
								display.group
							});
							if (interpolablesTreeGroups.Count != 1)
							{
								list.Add(new GroupElement
								{
									icon = this._addToFolderSprite,
									text = "Parent to",
									elements = interpolablesTreeGroups
								});
							}
							List<AContextMenuElement> list8 = list;
							LeafElement leafElement7 = new LeafElement();
							leafElement7.icon = this._checkboxSprite;
							leafElement7.text = "Disable";
							Action<object> onClick7;
							if ((onClick7 = <>9__16) == null)
							{
								onClick7 = (<>9__16 = delegate(object p)
								{
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											((LeafNode<Interpolable>)n).obj.enabled = false;
										}
									});
									this.UpdateInterpolablesView();
								});
							}
							leafElement7.onClick = onClick7;
							list8.Add(leafElement7);
							List<AContextMenuElement> list9 = list;
							LeafElement leafElement8 = new LeafElement();
							leafElement8.icon = this._checkboxCompositeSprite;
							leafElement8.text = "Enable";
							Action<object> onClick8;
							if ((onClick8 = <>9__18) == null)
							{
								onClick8 = (<>9__18 = delegate(object p)
								{
									this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
									{
										if (n.type == INodeType.Leaf)
										{
											((LeafNode<Interpolable>)n).obj.enabled = true;
										}
									});
									this.UpdateInterpolablesView();
								});
							}
							leafElement8.onClick = onClick8;
							list9.Add(leafElement8);
							List<AContextMenuElement> list10 = list;
							LeafElement leafElement9 = new LeafElement();
							leafElement9.icon = this._chevronUpSprite;
							leafElement9.text = "Move up";
							Action<object> onClick9;
							if ((onClick9 = <>9__20) == null)
							{
								onClick9 = (<>9__20 = delegate(object p)
								{
									this._interpolablesTree.MoveUp(display.group);
									this.UpdateInterpolablesView();
								});
							}
							leafElement9.onClick = onClick9;
							list10.Add(leafElement9);
							List<AContextMenuElement> list11 = list;
							LeafElement leafElement10 = new LeafElement();
							leafElement10.icon = this._chevronDownSprite;
							leafElement10.text = "Move down";
							Action<object> onClick10;
							if ((onClick10 = <>9__21) == null)
							{
								onClick10 = (<>9__21 = delegate(object p)
								{
									this._interpolablesTree.MoveDown(display.group);
									this.UpdateInterpolablesView();
								});
							}
							leafElement10.onClick = onClick10;
							list11.Add(leafElement10);
							List<AContextMenuElement> list12 = list;
							LeafElement leafElement11 = new LeafElement();
							leafElement11.icon = this._deleteSprite;
							leafElement11.text = "Delete";
							Action<object> onClick11;
							if ((onClick11 = <>9__22) == null)
							{
								onClick11 = (<>9__22 = delegate(object p)
								{
									Action<bool> callback;
									if ((callback = <>9__23) == null)
									{
										callback = (<>9__23 = delegate(bool result)
										{
											if (result)
											{
												List<Interpolable> interpolables = new List<Interpolable>();
												this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
												{
													if (n.type == INodeType.Leaf)
													{
														interpolables.Add(((LeafNode<Interpolable>)n).obj);
													}
												});
												this.RemoveInterpolables(interpolables);
												this._interpolablesTree.Remove(display.group);
												this.UpdateInterpolablesView();
											}
										});
									}
									UIUtility.DisplayConfirmationDialog(callback, "Are you sure you want to delete this group?");
								});
							}
							leafElement11.onClick = onClick11;
							list12.Add(leafElement11);
							UIUtility.ShowContextMenu(this._ui, anchoredPosition, list, 180f);
						}
						break;
					}
					case 2:
						if (display.group != null && Input.GetKey(306))
						{
							List<Interpolable> interpolables = new List<Interpolable>();
							this._interpolablesTree.Recurse(display.group, delegate(INode n, int d)
							{
								if (n.type == INodeType.Leaf)
								{
									interpolables.Add(((LeafNode<Interpolable>)n).obj);
								}
							});
							this.RemoveInterpolables(interpolables);
							this._interpolablesTree.Remove(display.group);
							return;
						}
						break;
					default:
						return;
					}
				};
				this._displayedOwnerHeader.Add(display);
			}
			display.gameObject.SetActive(true);
			display.layoutElement.preferredHeight = (treeHeader ? 21.333334f : 32f);
			return display;
		}

		// Token: 0x06000089 RID: 137 RVA: 0x00008878 File Offset: 0x00006A78
		private List<AContextMenuElement> GetInterpolablesTreeGroups(IEnumerable<INode> toParent)
		{
			IEnumerable<IGroupNode> source = (from n in toParent
			where n.parent != null
			select n.parent).Distinct<IGroupNode>();
			IGroupNode toIgnore = null;
			if (source.Count<IGroupNode>() == 1)
			{
				toIgnore = source.FirstOrDefault<IGroupNode>();
			}
			List<AContextMenuElement> list = this.RecurseInterpolablesTreeGroups(this._interpolablesTree.tree, toParent, toIgnore);
			list.Insert(0, new LeafElement
			{
				text = "Nothing",
				onClick = delegate(object p)
				{
					this._interpolablesTree.ParentTo(toParent, null);
					this.UpdateInterpolablesView();
				}
			});
			return list;
		}

		// Token: 0x0600008A RID: 138 RVA: 0x00008950 File Offset: 0x00006B50
		private List<AContextMenuElement> RecurseInterpolablesTreeGroups(List<INode> nodes, IEnumerable<INode> toParent, IGroupNode toIgnore)
		{
			List<AContextMenuElement> list = new List<AContextMenuElement>();
			foreach (INode node in nodes)
			{
				if (node.type == INodeType.Group)
				{
					GroupNode<Timeline.InterpolableGroup> group = (GroupNode<Timeline.InterpolableGroup>)node;
					if (node != toIgnore)
					{
						list.Add(new LeafElement
						{
							icon = this._addToFolderSprite,
							text = group.obj.name,
							onClick = delegate(object p)
							{
								this._interpolablesTree.ParentTo(toParent, group);
								this.UpdateInterpolablesView();
							}
						});
					}
					if (group.children.Count((INode n) => n.type == INodeType.Group) != 0)
					{
						list.Add(new GroupElement
						{
							text = group.obj.name,
							elements = this.RecurseInterpolablesTreeGroups(group.children, toParent, toIgnore)
						});
					}
				}
			}
			return list;
		}

		// Token: 0x0600008B RID: 139 RVA: 0x00008AB8 File Offset: 0x00006CB8
		private void HighlightInterpolable(Interpolable interpolable)
		{
			this.StartCoroutine(this.HighlightInterpolable_Routine(interpolable));
		}

		// Token: 0x0600008C RID: 140 RVA: 0x00008AC8 File Offset: 0x00006CC8
		private IEnumerator HighlightInterpolable_Routine(Interpolable interpolable)
		{
			Timeline.InterpolableDisplay display = this._displayedInterpolables.FirstOrDefault((Timeline.InterpolableDisplay d) => d.interpolable.obj == interpolable);
			if (display != null)
			{
				Color first = interpolable.color.GetContrastingColor();
				Color second = first.GetContrastingColor();
				float startTime = Time.unscaledTime;
				while (Time.unscaledTime - startTime < 0.25f)
				{
					this.UpdateInterpolableColor(display, Color.Lerp(interpolable.color, first, (Time.unscaledTime - startTime) * 4f));
					yield return null;
				}
				startTime = Time.unscaledTime;
				while (Time.unscaledTime - startTime < 1f)
				{
					this.UpdateInterpolableColor(display, Color.Lerp(second, first, (Mathf.Cos((Time.unscaledTime - startTime) * 3.1415927f * 4f) + 1f) / 2f));
					yield return null;
				}
				startTime = Time.unscaledTime;
				while (Time.unscaledTime - startTime < 0.25f)
				{
					this.UpdateInterpolableColor(display, Color.Lerp(first, interpolable.color, (Time.unscaledTime - startTime) * 4f));
					yield return null;
				}
				this.UpdateInterpolableColor(display, interpolable.color);
				first = default(Color);
				second = default(Color);
			}
			yield break;
		}

		// Token: 0x0600008D RID: 141 RVA: 0x00008AE0 File Offset: 0x00006CE0
		private void PotentiallyBeginAreaSelect(PointerEventData e)
		{
			Vector2 vector;
			if (RectTransformUtility.ScreenPointToLocalPointInRectangle(this._keyframesContainer, e.position, e.pressEventCamera, ref vector))
			{
				if (Input.GetKey(304))
				{
					float num = 10f * vector.x / (300f * this._zoomLevel);
					float num2 = this._blockLength / (float)this._divisions;
					float num3 = num % num2;
					if (num3 / num2 > 0.5f)
					{
						num += num2 - num3;
					}
					else
					{
						num -= num3;
					}
					vector.x = num * (300f * this._zoomLevel) / 10f;
				}
				this._areaSelectFirstPoint = vector;
			}
			this._isAreaSelecting = false;
		}

		// Token: 0x0600008E RID: 142 RVA: 0x00008B90 File Offset: 0x00006D90
		private void BeginAreaSelect(PointerEventData e)
		{
			this._isAreaSelecting = true;
			this._selectionArea.gameObject.SetActive(true);
		}

		// Token: 0x0600008F RID: 143 RVA: 0x00008BAC File Offset: 0x00006DAC
		private void UpdateAreaSelect(PointerEventData e)
		{
			if (!this._isAreaSelecting)
			{
				return;
			}
			Vector2 vector;
			if (RectTransformUtility.ScreenPointToLocalPointInRectangle(this._keyframesContainer, e.position, e.pressEventCamera, ref vector))
			{
				if (Input.GetKey(304))
				{
					float num = 10f * vector.x / (300f * this._zoomLevel);
					float num2 = this._blockLength / (float)this._divisions;
					float num3 = num % num2;
					if (num3 / num2 > 0.5f)
					{
						num += num2 - num3;
					}
					else
					{
						num -= num3;
					}
					vector.x = num * (300f * this._zoomLevel) / 10f;
				}
				Vector2 offsetMin;
				offsetMin..ctor(Mathf.Min(this._areaSelectFirstPoint.x, vector.x), Mathf.Min(this._areaSelectFirstPoint.y, vector.y));
				Vector2 offsetMax;
				offsetMax..ctor(Mathf.Max(this._areaSelectFirstPoint.x, vector.x), Mathf.Max(this._areaSelectFirstPoint.y, vector.y));
				this._selectionArea.offsetMin = offsetMin;
				this._selectionArea.offsetMax = offsetMax;
			}
		}

		// Token: 0x06000090 RID: 144 RVA: 0x00008CDC File Offset: 0x00006EDC
		private void EndAreaSelect(PointerEventData e)
		{
			Vector2 vector;
			if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(this._keyframesContainer, e.position, e.pressEventCamera, ref vector))
			{
				return;
			}
			float num = 10f * this._areaSelectFirstPoint.x / (300f * this._zoomLevel);
			float num2 = 10f * vector.x / (300f * this._zoomLevel);
			if (Input.GetKey(304))
			{
				float num3 = this._blockLength / (float)this._divisions;
				float num4 = num2 % num3;
				if (num4 / num3 > 0.5f)
				{
					num2 += num3 - num4;
				}
				else
				{
					num2 -= num4;
				}
			}
			if (num2 < num)
			{
				float num5 = num;
				num = num2;
				num2 = num5;
			}
			float num6 = Mathf.Min(this._areaSelectFirstPoint.y, vector.y);
			float num7 = Mathf.Max(this._areaSelectFirstPoint.y, vector.y);
			this._selectionArea.gameObject.SetActive(false);
			this._isAreaSelecting = false;
			List<KeyValuePair<float, Keyframe>> list = new List<KeyValuePair<float, Keyframe>>();
			foreach (Timeline.InterpolableDisplay interpolableDisplay in this._displayedInterpolables)
			{
				if (!interpolableDisplay.gameObject.activeSelf)
				{
					break;
				}
				float y = ((RectTransform)interpolableDisplay.gameObject.transform).anchoredPosition.y;
				if (y > num6 && y < num7)
				{
					foreach (KeyValuePair<float, Keyframe> item in interpolableDisplay.interpolable.obj.keyframes)
					{
						if (item.Key >= num && item.Key <= num2)
						{
							list.Add(item);
						}
					}
				}
			}
			if (Input.GetKey(306))
			{
				this.SelectAddKeyframes(list);
				return;
			}
			this.SelectKeyframes(list);
		}

		// Token: 0x06000091 RID: 145 RVA: 0x00008F00 File Offset: 0x00007100
		private void SelectAddInterpolable(params Interpolable[] interpolables)
		{
			for (int i = 0; i < interpolables.Length; i++)
			{
				Interpolable interpolable = interpolables[i];
				int num = this._selectedInterpolables.FindIndex((Interpolable k) => k == interpolable);
				if (num != -1)
				{
					this._selectedInterpolables.RemoveAt(num);
				}
				else
				{
					this._selectedInterpolables.Add(interpolable);
				}
			}
			this.UpdateInterpolableSelection();
		}

		// Token: 0x06000092 RID: 146 RVA: 0x00008F80 File Offset: 0x00007180
		private void SelectInterpolable(params Interpolable[] interpolables)
		{
			this._selectedInterpolables.Clear();
			this.SelectAddInterpolable(interpolables);
		}

		// Token: 0x06000093 RID: 147 RVA: 0x00008F94 File Offset: 0x00007194
		private void ClearSelectedInterpolables()
		{
			this._selectedInterpolables.Clear();
			this.UpdateInterpolableSelection();
		}

		// Token: 0x06000094 RID: 148 RVA: 0x00008FA8 File Offset: 0x000071A8
		private void UpdateInterpolableSelection()
		{
			using (List<Timeline.InterpolableDisplay>.Enumerator enumerator = this._displayedInterpolables.GetEnumerator())
			{
				while (enumerator.MoveNext())
				{
					Timeline.InterpolableDisplay display = enumerator.Current;
					bool flag = this._selectedInterpolables.Any((Interpolable e) => e == display.interpolable.obj);
					display.selectedOutline.gameObject.SetActive(flag);
					display.background.material.SetFloat("_DrawChecker", flag ? 1f : 0f);
					display.gridBackground.material.SetFloat("_DrawChecker", flag ? 1f : 0f);
					display.name.fontStyle = (flag ? 1 : 0);
					display.background.enabled = false;
					display.background.enabled = true;
					display.gridBackground.enabled = false;
					display.gridBackground.enabled = true;
				}
			}
		}

		// Token: 0x06000095 RID: 149 RVA: 0x00009104 File Offset: 0x00007304
		private void UpdateGrid()
		{
			this._durationInputField.text = string.Format("{0:00}:{1:00.00}", Mathf.FloorToInt(this._duration / 60f), this._duration % 60f);
			this._horizontalScrollView.content.sizeDelta = new Vector2(300f * this._zoomLevel * this._duration / 10f, this._horizontalScrollView.content.sizeDelta.y);
			this.UpdateGridMaterial();
			int num = Mathf.CeilToInt(this._duration / this._blockLength);
			int i = 0;
			for (int j = 1; j < num; j++)
			{
				Text text;
				if (i < this._timeTexts.Count)
				{
					text = this._timeTexts[i];
				}
				else
				{
					text = UIUtility.CreateText("Time " + i.ToString(), this._textsContainer, "Text");
					text.alignByGeometry = true;
					text.alignment = 4;
					text.color = Color.white;
					text.raycastTarget = false;
					text.rectTransform.SetRect(Vector2.zero, new Vector2(0f, 1f), Vector2.zero, new Vector2(60f, 0f));
					this._timeTexts.Add(text);
				}
				text.text = string.Format("{0:00}:{1:00.##}", Mathf.FloorToInt((float)j * this._blockLength / 60f), (float)j * this._blockLength % 60f);
				text.gameObject.SetActive(true);
				text.rectTransform.anchoredPosition = new Vector2((float)j * this._blockLength * 300f * this._zoomLevel / 10f, text.rectTransform.anchoredPosition.y);
				i++;
			}
			while (i < this._timeTexts.Count)
			{
				this._timeTexts[i].gameObject.SetActive(false);
				i++;
			}
			bool isOn = this._allToggle.isOn;
			int k = 0;
			int num2 = 0;
			this.UpdateKeyframesTree(this._interpolablesTree.tree, isOn, ref num2, ref k);
			while (k < this._displayedKeyframes.Count)
			{
				Timeline.KeyframeDisplay keyframeDisplay = this._displayedKeyframes[k];
				keyframeDisplay.gameObject.SetActive(false);
				keyframeDisplay.keyframe = null;
				k++;
			}
			this.UpdateKeyframeSelection();
			this.UpdateCursor();
			this.ExecuteDelayed(delegate()
			{
				this._keyframesContainer.sizeDelta = new Vector2(this._keyframesContainer.sizeDelta.x, this._verticalScrollView.content.rect.height);
			}, 2);
		}

		// Token: 0x06000096 RID: 150 RVA: 0x000093A0 File Offset: 0x000075A0
		private void UpdateKeyframesTree(List<INode> nodes, bool showAll, ref int interpolableIndex, ref int keyframeIndex)
		{
			foreach (INode node in nodes)
			{
				INodeType type = node.type;
				if (type != INodeType.Leaf)
				{
					if (type == INodeType.Group)
					{
						GroupNode<Timeline.InterpolableGroup> groupNode = (GroupNode<Timeline.InterpolableGroup>)node;
						if (groupNode.obj.expanded)
						{
							this.UpdateKeyframesTree(groupNode.children, showAll, ref interpolableIndex, ref keyframeIndex);
						}
					}
				}
				else
				{
					Interpolable obj = ((LeafNode<Interpolable>)node).obj;
					if ((showAll || ((obj.oci == null || obj.oci == this._selectedOCI) && obj.ShouldShow())) && obj.name.IndexOf(this._interpolablesSearchField.text, StringComparison.OrdinalIgnoreCase) != -1)
					{
						Timeline.InterpolableDisplay interpolableDisplay = this._displayedInterpolables[interpolableIndex];
						foreach (KeyValuePair<float, Keyframe> keyValuePair in obj.keyframes)
						{
							Timeline.KeyframeDisplay display;
							if (keyframeIndex < this._displayedKeyframes.Count)
							{
								display = this._displayedKeyframes[keyframeIndex];
							}
							else
							{
								display = new Timeline.KeyframeDisplay();
								display.gameObject = Object.Instantiate<GameObject>(this._keyframePrefab);
								display.gameObject.hideFlags = 0;
								display.image = display.gameObject.transform.Find("RawImage").GetComponent<RawImage>();
								display.gameObject.transform.SetParent(this._keyframesContainer);
								display.gameObject.transform.localPosition = Vector3.zero;
								display.gameObject.transform.localScale = Vector3.one;
								PointerEnterHandler pointerEnterHandler = display.gameObject.AddComponent<PointerEnterHandler>();
								Func<KeyValuePair<float, Keyframe>, bool> <>9__6;
								pointerEnterHandler.onPointerEnter = delegate(PointerEventData e)
								{
									this._tooltip.transform.parent.gameObject.SetActive(true);
									IEnumerable<KeyValuePair<float, Keyframe>> keyframes = display.keyframe.parent.keyframes;
									Func<KeyValuePair<float, Keyframe>, bool> predicate;
									if ((predicate = <>9__6) == null)
									{
										predicate = (<>9__6 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
									}
									float key = keyframes.First(predicate).Key;
									this._tooltip.text = string.Format("T: {0:00}:{1:00.########}\nV: {2}", Mathf.FloorToInt(key / 60f), key % 60f, display.keyframe.value);
								};
								pointerEnterHandler.onPointerExit = delegate(PointerEventData e)
								{
									this._tooltip.transform.parent.gameObject.SetActive(false);
								};
								Func<KeyValuePair<float, Keyframe>, bool> <>9__7;
								Func<KeyValuePair<float, Keyframe>, bool> <>9__10;
								Func<KeyValuePair<float, Keyframe>, bool> <>9__12;
								Func<KeyValuePair<float, Keyframe>, bool> <>9__11;
								Func<KeyValuePair<float, Keyframe>, bool> <>9__8;
								Func<KeyValuePair<float, Keyframe>, bool> <>9__9;
								Func<KeyValuePair<float, Keyframe>, bool> <>9__14;
								display.gameObject.AddComponent<PointerDownHandler>().onPointerDown = delegate(PointerEventData e)
								{
									if (Input.GetKey(308))
									{
										return;
									}
									switch (e.button)
									{
									case 0:
									{
										if (Input.GetKey(306) || Input.GetKey(305))
										{
											Timeline <>4__this = this;
											KeyValuePair<float, Keyframe>[] array = new KeyValuePair<float, Keyframe>[1];
											int num = 0;
											IEnumerable<KeyValuePair<float, Keyframe>> keyframes = display.keyframe.parent.keyframes;
											Func<KeyValuePair<float, Keyframe>, bool> predicate;
											if ((predicate = <>9__7) == null)
											{
												predicate = (<>9__7 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
											}
											array[num] = keyframes.First(predicate);
											<>4__this.SelectAddKeyframes(array);
											return;
										}
										if (!Input.GetKey(304) && !Input.GetKey(303))
										{
											Timeline <>4__this2 = this;
											KeyValuePair<float, Keyframe>[] array2 = new KeyValuePair<float, Keyframe>[1];
											int num2 = 0;
											IEnumerable<KeyValuePair<float, Keyframe>> keyframes2 = display.keyframe.parent.keyframes;
											Func<KeyValuePair<float, Keyframe>, bool> predicate2;
											if ((predicate2 = <>9__8) == null)
											{
												predicate2 = (<>9__8 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
											}
											array2[num2] = keyframes2.First(predicate2);
											<>4__this2.SelectKeyframes(array2);
											return;
										}
										IEnumerable<KeyValuePair<float, Keyframe>> selectedKeyframes = this._selectedKeyframes;
										Func<KeyValuePair<float, Keyframe>, bool> predicate3;
										if ((predicate3 = <>9__10) == null)
										{
											predicate3 = (<>9__10 = ((KeyValuePair<float, Keyframe> k) => k.Value.parent == display.keyframe.parent));
										}
										KeyValuePair<float, Keyframe> keyValuePair2 = selectedKeyframes.LastOrDefault(predicate3);
										if (keyValuePair2.Value != null)
										{
											IEnumerable<KeyValuePair<float, Keyframe>> keyframes3 = display.keyframe.parent.keyframes;
											Func<KeyValuePair<float, Keyframe>, bool> predicate4;
											if ((predicate4 = <>9__12) == null)
											{
												predicate4 = (<>9__12 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
											}
											KeyValuePair<float, Keyframe> keyValuePair3 = keyframes3.First(predicate4);
											float minTime;
											float maxTime;
											if (keyValuePair2.Key < keyValuePair3.Key)
											{
												minTime = keyValuePair2.Key;
												maxTime = keyValuePair3.Key;
											}
											else
											{
												minTime = keyValuePair3.Key;
												maxTime = keyValuePair2.Key;
											}
											this.SelectAddKeyframes(from k in display.keyframe.parent.keyframes
											where k.Key > minTime && k.Key < maxTime
											select k);
											this.SelectAddKeyframes(new KeyValuePair<float, Keyframe>[]
											{
												keyValuePair3
											});
											return;
										}
										Timeline <>4__this3 = this;
										KeyValuePair<float, Keyframe>[] array3 = new KeyValuePair<float, Keyframe>[1];
										int num3 = 0;
										IEnumerable<KeyValuePair<float, Keyframe>> keyframes4 = display.keyframe.parent.keyframes;
										Func<KeyValuePair<float, Keyframe>, bool> predicate5;
										if ((predicate5 = <>9__11) == null)
										{
											predicate5 = (<>9__11 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
										}
										array3[num3] = keyframes4.First(predicate5);
										<>4__this3.SelectAddKeyframes(array3);
										return;
									}
									case 1:
									{
										Timeline <>4__this4 = this;
										IEnumerable<KeyValuePair<float, Keyframe>> keyframes5 = display.keyframe.parent.keyframes;
										Func<KeyValuePair<float, Keyframe>, bool> predicate6;
										if ((predicate6 = <>9__9) == null)
										{
											predicate6 = (<>9__9 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
										}
										<>4__this4.SeekPlaybackTime(keyframes5.First(predicate6).Key);
										return;
									}
									case 2:
										if (Input.GetKey(306))
										{
											List<KeyValuePair<float, Keyframe>> list = new List<KeyValuePair<float, Keyframe>>();
											if (Input.GetKey(304))
											{
												list.AddRange(this._selectedKeyframes);
											}
											IEnumerable<KeyValuePair<float, Keyframe>> keyframes6 = display.keyframe.parent.keyframes;
											Func<KeyValuePair<float, Keyframe>, bool> predicate7;
											if ((predicate7 = <>9__14) == null)
											{
												predicate7 = (<>9__14 = ((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe));
											}
											KeyValuePair<float, Keyframe> item = keyframes6.FirstOrDefault(predicate7);
											if (item.Value != null)
											{
												list.Add(item);
											}
											if (list.Count != 0)
											{
												this.DeleteKeyframes(list, true);
												this._tooltip.transform.parent.gameObject.SetActive(false);
											}
										}
										return;
									default:
										return;
									}
								};
								DragHandler dragHandler = display.gameObject.AddComponent<DragHandler>();
								dragHandler.onBeginDrag = delegate(PointerEventData e)
								{
									if (!Input.GetKey(308))
									{
										return;
									}
									Vector2 vector;
									if (RectTransformUtility.ScreenPointToLocalPointInRectangle(this._keyframesContainer, e.position, e.pressEventCamera, ref vector))
									{
										this._selectedKeyframesXOffset.Clear();
										using (List<KeyValuePair<float, Keyframe>>.Enumerator enumerator3 = this._selectedKeyframes.GetEnumerator())
										{
											while (enumerator3.MoveNext())
											{
												KeyValuePair<float, Keyframe> selectedKeyframe = enumerator3.Current;
												Timeline.KeyframeDisplay keyframeDisplay = this._displayedKeyframes.Find((Timeline.KeyframeDisplay d) => d.keyframe == selectedKeyframe.Value);
												this._selectedKeyframesXOffset.Add(keyframeDisplay, ((RectTransform)keyframeDisplay.gameObject.transform).anchoredPosition.x - vector.x);
											}
										}
									}
									if (this._selectedKeyframesXOffset.Count != 0)
									{
										this._isPlaying = false;
									}
									e.Reset();
								};
								dragHandler.onDrag = delegate(PointerEventData e)
								{
									if (this._selectedKeyframesXOffset.Count == 0)
									{
										return;
									}
									Vector2 vector;
									if (RectTransformUtility.ScreenPointToLocalPointInRectangle(this._keyframesContainer, e.position, e.pressEventCamera, ref vector))
									{
										float num = vector.x;
										foreach (KeyValuePair<Timeline.KeyframeDisplay, float> keyValuePair2 in this._selectedKeyframesXOffset)
										{
											float num2 = vector.x + keyValuePair2.Value;
											if (num2 < 0f)
											{
												num = vector.x - num2;
											}
										}
										if (Input.GetKey(304))
										{
											float num3 = 10f * num / (300f * this._zoomLevel);
											float num4 = this._blockLength / (float)this._divisions;
											float num5 = num3 % num4;
											if (num5 / num4 > 0.5f)
											{
												num3 += num4 - num5;
											}
											else
											{
												num3 -= num5;
											}
											num = num3 * 300f * this._zoomLevel / 10f - this._selectedKeyframesXOffset[display];
										}
										foreach (KeyValuePair<Timeline.KeyframeDisplay, float> keyValuePair3 in this._selectedKeyframesXOffset)
										{
											RectTransform rectTransform = (RectTransform)keyValuePair3.Key.gameObject.transform;
											rectTransform.anchoredPosition = new Vector2(num + keyValuePair3.Value, rectTransform.anchoredPosition.y);
										}
									}
									e.Reset();
								};
								dragHandler.onEndDrag = delegate(PointerEventData e)
								{
									if (this._selectedKeyframesXOffset.Count == 0)
									{
										return;
									}
									using (Dictionary<Timeline.KeyframeDisplay, float>.Enumerator enumerator3 = this._selectedKeyframesXOffset.GetEnumerator())
									{
										while (enumerator3.MoveNext())
										{
											KeyValuePair<Timeline.KeyframeDisplay, float> pair = enumerator3.Current;
											RectTransform rectTransform = (RectTransform)pair.Key.gameObject.transform;
											float num = 10f * rectTransform.anchoredPosition.x / (300f * this._zoomLevel);
											this.MoveKeyframe(pair.Key.keyframe, num);
											int index = this._selectedKeyframes.FindIndex((KeyValuePair<float, Keyframe> k) => k.Value == pair.Key.keyframe);
											this._selectedKeyframes[index] = new KeyValuePair<float, Keyframe>(num, pair.Key.keyframe);
										}
									}
									e.Reset();
									this.UpdateKeyframeWindow(false);
									this._selectedKeyframesXOffset.Clear();
								};
								this._displayedKeyframes.Add(display);
							}
							display.gameObject.SetActive(true);
							((RectTransform)display.gameObject.transform).anchoredPosition = new Vector2(300f * this._zoomLevel * keyValuePair.Key / 10f, ((RectTransform)interpolableDisplay.gameObject.transform).anchoredPosition.y);
							display.keyframe = keyValuePair.Value;
							keyframeIndex++;
						}
						interpolableIndex++;
					}
				}
			}
		}

		// Token: 0x06000097 RID: 151 RVA: 0x00009724 File Offset: 0x00007924
		private void UpdateGridMaterial()
		{
			this._gridImage.material.SetFloat("_TilingX", this._duration / 10f);
			this._gridImage.material.SetFloat("_BlockLength", this._blockLength);
			this._gridImage.material.SetFloat("_Divisions", (float)this._divisions);
			this._gridImage.enabled = false;
			this._gridImage.enabled = true;
		}

		// Token: 0x06000098 RID: 152 RVA: 0x000097A8 File Offset: 0x000079A8
		private void SelectAddKeyframes(params KeyValuePair<float, Keyframe>[] keyframes)
		{
			this.SelectAddKeyframes(keyframes);
		}

		// Token: 0x06000099 RID: 153 RVA: 0x000097B4 File Offset: 0x000079B4
		private void SelectAddKeyframes(IEnumerable<KeyValuePair<float, Keyframe>> keyframes)
		{
			using (IEnumerator<KeyValuePair<float, Keyframe>> enumerator = keyframes.GetEnumerator())
			{
				while (enumerator.MoveNext())
				{
					KeyValuePair<float, Keyframe> keyframe = enumerator.Current;
					int num = this._selectedKeyframes.FindIndex((KeyValuePair<float, Keyframe> k) => k.Value == keyframe.Value);
					if (num != -1)
					{
						this._selectedKeyframes.RemoveAt(num);
					}
					else
					{
						this._selectedKeyframes.Add(keyframe);
					}
				}
			}
			this._keyframeSelectionSize = (double)(this._selectedKeyframes.Max((KeyValuePair<float, Keyframe> k) => k.Key) - this._selectedKeyframes.Min((KeyValuePair<float, Keyframe> k) => k.Key));
			this.UpdateKeyframeSelection();
			this.UpdateKeyframeWindow(true);
		}

		// Token: 0x0600009A RID: 154 RVA: 0x000098BC File Offset: 0x00007ABC
		private void SelectKeyframes(params KeyValuePair<float, Keyframe>[] keyframes)
		{
			this.SelectKeyframes(keyframes);
		}

		// Token: 0x0600009B RID: 155 RVA: 0x000098C8 File Offset: 0x00007AC8
		private void SelectKeyframes(IEnumerable<KeyValuePair<float, Keyframe>> keyframes)
		{
			this._selectedKeyframes.Clear();
			if (keyframes.Count<KeyValuePair<float, Keyframe>>() != 0)
			{
				this.SelectAddKeyframes(keyframes);
			}
		}

		// Token: 0x0600009C RID: 156 RVA: 0x000098E8 File Offset: 0x00007AE8
		private void UpdateKeyframeSelection()
		{
			using (List<Timeline.KeyframeDisplay>.Enumerator enumerator = this._displayedKeyframes.GetEnumerator())
			{
				while (enumerator.MoveNext())
				{
					Timeline.KeyframeDisplay display = enumerator.Current;
					display.image.color = (this._selectedKeyframes.Any((KeyValuePair<float, Keyframe> k) => k.Value == display.keyframe) ? Color.green : Color.red);
				}
			}
		}

		// Token: 0x0600009D RID: 157 RVA: 0x00009980 File Offset: 0x00007B80
		private void ScaleKeyframeSelection(float scrollDelta)
		{
			float num = float.PositiveInfinity;
			float num2 = float.NegativeInfinity;
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				if (keyValuePair.Key < num)
				{
					num = keyValuePair.Key;
				}
				if (keyValuePair.Key > num2)
				{
					num2 = keyValuePair.Key;
				}
			}
			if (Mathf.Approximately(num, num2))
			{
				return;
			}
			double num3 = (double)(num2 - num);
			int num4 = 1;
			for (;;)
			{
				bool flag = false;
				double num5 = Math.Round(Math.Round(num3 * 10.0) / this._keyframeSelectionSize + (double)(num4 * ((scrollDelta > 0f) ? 1 : -1))) / 10.0;
				bool flag2 = false;
				if (num5 < 0.1)
				{
					flag2 = true;
					num5 = 0.1;
				}
				double num6 = num5 * this._keyframeSelectionSize;
				foreach (KeyValuePair<float, Keyframe> keyValuePair2 in this._selectedKeyframes)
				{
					float key = (float)((double)(keyValuePair2.Key - num) * num6 / num3 + (double)num);
					Keyframe keyframe;
					if (keyValuePair2.Value.parent.keyframes.TryGetValue(key, out keyframe) && keyframe != keyValuePair2.Value)
					{
						flag = true;
						num4++;
						break;
					}
				}
				if (flag2 && flag)
				{
					break;
				}
				if (!flag)
				{
					goto Block_7;
				}
			}
			return;
			Block_7:
			for (int i = 0; i < this._selectedKeyframes.Count; i++)
			{
				KeyValuePair<float, Keyframe> keyValuePair3 = this._selectedKeyframes[i];
				double num6;
				float num7 = (float)((double)(keyValuePair3.Key - num) * num6 / num3 + (double)num);
				this.MoveKeyframe(keyValuePair3.Value, num7);
				this._selectedKeyframes[i] = new KeyValuePair<float, Keyframe>(num7, keyValuePair3.Value);
			}
			this.UpdateKeyframeWindow(false);
			this.UpdateGrid();
		}

		// Token: 0x0600009E RID: 158 RVA: 0x00009BAC File Offset: 0x00007DAC
		private void OnKeyframeContainerMouseDown(PointerEventData eventData)
		{
			Vector2 vector;
			if (eventData.button == 2 && !Input.GetKey(306) && RectTransformUtility.ScreenPointToLocalPointInRectangle(this._keyframesContainer, eventData.position, eventData.pressEventCamera, ref vector))
			{
				float num = 10f * vector.x / (300f * this._zoomLevel);
				if (Input.GetKey(304))
				{
					float num2 = this._blockLength / (float)this._divisions;
					float num3 = num % num2;
					if (num3 / num2 > 0.5f)
					{
						num += num2 - num3;
					}
					else
					{
						num -= num3;
					}
				}
				if (Input.GetKey(308) && this._selectedInterpolables.Count != 0)
				{
					foreach (Interpolable interpolable in this._selectedInterpolables)
					{
						this.AddKeyframe(interpolable, num);
					}
					this.UpdateGrid();
					return;
				}
				if (this._selectedInterpolables.Count != 0)
				{
					this.ClearSelectedInterpolables();
				}
				InterpolableModel interpolableModel = null;
				float num4 = float.MaxValue;
				foreach (Timeline.InterpolableDisplay interpolableDisplay in this._displayedInterpolables)
				{
					if (interpolableDisplay.gameObject.activeSelf)
					{
						float num5 = Mathf.Abs(vector.y - ((RectTransform)interpolableDisplay.gameObject.transform).anchoredPosition.y);
						if (num5 < num4)
						{
							num4 = num5;
							interpolableModel = interpolableDisplay.interpolable.obj;
						}
					}
				}
				foreach (Timeline.InterpolableModelDisplay interpolableModelDisplay in this._displayedInterpolableModels)
				{
					if (interpolableModelDisplay.gameObject.activeSelf)
					{
						float num6 = Mathf.Abs(vector.y - ((RectTransform)interpolableModelDisplay.gameObject.transform).anchoredPosition.y);
						if (num6 < num4)
						{
							num4 = num6;
							interpolableModel = interpolableModelDisplay.model;
						}
					}
				}
				if (interpolableModel != null)
				{
					Interpolable interpolable2;
					if (interpolableModel is Interpolable)
					{
						interpolable2 = (Interpolable)interpolableModel;
					}
					else
					{
						interpolable2 = this.AddInterpolable(interpolableModel);
					}
					if (interpolable2 != null)
					{
						this.AddKeyframe(interpolable2, num);
						this.UpdateGrid();
					}
				}
			}
		}

		// Token: 0x0600009F RID: 159 RVA: 0x00009E4C File Offset: 0x0000804C
		private void AddKeyframe(Interpolable interpolable, float time)
		{
			try
			{
				KeyValuePair<float, Keyframe> keyValuePair = interpolable.keyframes.LastOrDefault((KeyValuePair<float, Keyframe> k) => k.Key < time);
				Keyframe value;
				if (keyValuePair.Value != null)
				{
					value = new Keyframe(interpolable.GetValue(), interpolable, keyValuePair.Value.curve);
				}
				else
				{
					value = new Keyframe(interpolable.GetValue(), interpolable, AnimationCurve.Linear(0f, 0f, 1f, 1f));
				}
				interpolable.keyframes.Add(time, value);
				this.UpdateGrid();
			}
			catch (Exception ex)
			{
				string str = "Timeline: couldn't add keyframe to interpolable with value:";
				string str2 = (interpolable != null) ? interpolable.ToString() : null;
				string str3 = "\n";
				Exception ex2 = ex;
				Debug.LogError(str + str2 + str3 + ((ex2 != null) ? ex2.ToString() : null));
			}
		}

		// Token: 0x060000A0 RID: 160 RVA: 0x00009F3C File Offset: 0x0000813C
		private void CopyKeyframes()
		{
			this._copiedKeyframes.Clear();
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				this._copiedKeyframes.Add(new KeyValuePair<float, Keyframe>(keyValuePair.Key, new Keyframe(keyValuePair.Value)));
			}
		}

		// Token: 0x060000A1 RID: 161 RVA: 0x00009FBC File Offset: 0x000081BC
		private void CutKeyframes()
		{
			this.CopyKeyframes();
			if (this._selectedKeyframes.Count != 0)
			{
				this.DeleteKeyframes(this._selectedKeyframes, false);
			}
		}

		// Token: 0x060000A2 RID: 162 RVA: 0x00009FE4 File Offset: 0x000081E4
		private void PasteKeyframes()
		{
			if (this._copiedKeyframes.Count == 0)
			{
				return;
			}
			List<KeyValuePair<float, Keyframe>> list = new List<KeyValuePair<float, Keyframe>>();
			float time = this._playbackTime % this._duration;
			if (time == 0f && this._playbackTime == this._duration)
			{
				time = this._duration;
			}
			float startOffset = this._copiedKeyframes.Min((KeyValuePair<float, Keyframe> k) => k.Key);
			if (Input.GetKey(308))
			{
				double num = (double)(this._copiedKeyframes.Max((KeyValuePair<float, Keyframe> k) => k.Key) - startOffset + this._blockLength / (float)this._divisions);
				using (IEnumerator<IGrouping<Interpolable, KeyValuePair<float, Keyframe>>> enumerator = (from k in this._copiedKeyframes
				group k by k.Value.parent).GetEnumerator())
				{
					while (enumerator.MoveNext())
					{
						IGrouping<Interpolable, KeyValuePair<float, Keyframe>> grouping = enumerator.Current;
						foreach (KeyValuePair<float, Keyframe> keyValuePair in grouping.Key.keyframes.Reverse<KeyValuePair<float, Keyframe>>())
						{
							if (keyValuePair.Key >= time)
							{
								this.MoveKeyframe(keyValuePair.Value, (float)((double)keyValuePair.Key + num));
							}
						}
					}
					goto IL_1C4;
				}
			}
			if (this._copiedKeyframes.Any((KeyValuePair<float, Keyframe> k) => k.Value.parent.keyframes.ContainsKey(time + k.Key - startOffset)))
			{
				return;
			}
			IL_1C4:
			foreach (KeyValuePair<float, Keyframe> keyValuePair2 in this._copiedKeyframes)
			{
				float key = time + keyValuePair2.Key - startOffset;
				Keyframe value = new Keyframe(keyValuePair2.Value);
				keyValuePair2.Value.parent.keyframes.Add(key, value);
				list.Add(new KeyValuePair<float, Keyframe>(key, value));
			}
			this.SelectKeyframes(list);
			this.UpdateGrid();
		}

		// Token: 0x060000A3 RID: 163 RVA: 0x0000A270 File Offset: 0x00008470
		private void MoveKeyframe(Keyframe keyframe, float destinationTime)
		{
			Debug.LogError(keyframe.parent.keyframes.IndexOfValue(keyframe));
			keyframe.parent.keyframes.RemoveAt(keyframe.parent.keyframes.IndexOfValue(keyframe));
			keyframe.parent.keyframes.Add(destinationTime, keyframe);
			int num = this._selectedKeyframes.FindIndex((KeyValuePair<float, Keyframe> k) => k.Value == keyframe);
			if (num != -1)
			{
				this._selectedKeyframes[num] = new KeyValuePair<float, Keyframe>(destinationTime, keyframe);
			}
		}

		// Token: 0x060000A4 RID: 164 RVA: 0x0000A338 File Offset: 0x00008538
		private void OnGridTopMouse(PointerEventData eventData)
		{
			Vector2 vector;
			if (eventData.button == null && RectTransformUtility.ScreenPointToLocalPointInRectangle(this._gridTop, eventData.position, eventData.pressEventCamera, ref vector))
			{
				float num = 10f * vector.x / (300f * this._zoomLevel);
				if (Input.GetKey(304))
				{
					float num2 = this._blockLength / (float)this._divisions;
					float num3 = num % num2;
					if (num3 / num2 > 0.5f)
					{
						num += num2 - num3;
					}
					else
					{
						num -= num3;
					}
				}
				num = Mathf.Clamp(num, 0f, this._duration);
				this.SeekPlaybackTime(num);
			}
		}

		// Token: 0x060000A5 RID: 165 RVA: 0x0000A3E4 File Offset: 0x000085E4
		private void OnResizeWindow(PointerEventData eventData)
		{
			Vector2 vector;
			if (eventData.button == null && RectTransformUtility.ScreenPointToLocalPointInRectangle(this._timelineWindow, eventData.position, eventData.pressEventCamera, ref vector))
			{
				vector.x = Mathf.Clamp(vector.x, 615f, ((RectTransform)this._ui.transform).rect.width * 0.85f);
				vector.y = Mathf.Clamp(vector.y, 330f, ((RectTransform)this._ui.transform).rect.height * 0.85f);
				this._timelineWindow.sizeDelta = vector;
			}
		}

		// Token: 0x060000A6 RID: 166 RVA: 0x0000A4A0 File Offset: 0x000086A0
		private void SeekPlaybackTime(float t)
		{
			if (t == this._playbackTime)
			{
				return;
			}
			this._playbackTime = t;
			this._startTime = Time.time - this._playbackTime;
			bool isPlaying = this._isPlaying;
			this._isPlaying = true;
			this.UpdateCursor();
			this.Interpolate(true);
			this.Interpolate(false);
			this._isPlaying = isPlaying;
		}

		// Token: 0x060000A7 RID: 167 RVA: 0x0000A500 File Offset: 0x00008700
		private void ToggleSingleFilesPanel()
		{
			this._singleFilesPanel.SetActive(!this._singleFilesPanel.activeSelf);
			if (this._singleFilesPanel.activeSelf)
			{
				this.UpdateSingleFilesPanel();
			}
		}

		// Token: 0x060000A8 RID: 168 RVA: 0x0000A534 File Offset: 0x00008734
		private void UpdateSingleFilesPanel()
		{
			if (!Directory.Exists(Timeline._singleFilesFolder))
			{
				return;
			}
			string[] files = Directory.GetFiles(Timeline._singleFilesFolder, "*.xml");
			int i;
			for (i = 0; i < files.Length; i++)
			{
				Timeline.SingleFileDisplay display;
				if (i < this._displayedSingleFiles.Count)
				{
					display = this._displayedSingleFiles[i];
				}
				else
				{
					display = new Timeline.SingleFileDisplay();
					display.toggle = Object.Instantiate<GameObject>(this._singleFilePrefab).GetComponent<Toggle>();
					display.toggle.gameObject.hideFlags = 0;
					display.text = display.toggle.GetComponentInChildren<Text>();
					display.toggle.transform.SetParent(this._singleFilesContainer);
					display.toggle.transform.localScale = Vector3.one;
					display.toggle.transform.localPosition = Vector3.zero;
					display.toggle.group = this._singleFilesContainer.GetComponent<ToggleGroup>();
					this._displayedSingleFiles.Add(display);
				}
				string fileName = Path.GetFileNameWithoutExtension(files[i]);
				display.toggle.gameObject.SetActive(true);
				display.toggle.onValueChanged = new Toggle.ToggleEvent();
				display.toggle.onValueChanged.AddListener(delegate(bool b)
				{
					if (display.toggle.isOn)
					{
						this._singleFileNameField.text = fileName;
					}
				});
				display.text.text = fileName;
			}
			while (i < this._displayedSingleFiles.Count)
			{
				this._displayedSingleFiles[i].toggle.gameObject.SetActive(false);
				i++;
			}
			this.UpdateSingleFileSelection();
		}

		// Token: 0x060000A9 RID: 169 RVA: 0x0000A730 File Offset: 0x00008930
		private void UpdateSingleFileSelection()
		{
			foreach (Timeline.SingleFileDisplay singleFileDisplay in this._displayedSingleFiles)
			{
				if (!singleFileDisplay.toggle.gameObject.activeSelf)
				{
					break;
				}
				singleFileDisplay.toggle.isOn = (string.Compare(this._singleFileNameField.text, singleFileDisplay.text.text, StringComparison.OrdinalIgnoreCase) == 0);
			}
		}

		// Token: 0x060000AA RID: 170 RVA: 0x0000A7C8 File Offset: 0x000089C8
		private void LoadSingleFile()
		{
			if (this._selectedOCI == null)
			{
				return;
			}
			string path = Path.Combine(Timeline._singleFilesFolder, this._singleFileNameField.text + ".xml");
			if (File.Exists(path))
			{
				this.LoadSingle(path);
			}
		}

		// Token: 0x060000AB RID: 171 RVA: 0x0000A818 File Offset: 0x00008A18
		private void SaveSingleFile()
		{
			if (this._selectedOCI == null)
			{
				return;
			}
			string text = this._singleFileNameField.text;
			foreach (char c in Path.GetInvalidPathChars())
			{
				text = text.Replace(c.ToString(), "");
			}
			if (string.IsNullOrEmpty(text))
			{
				return;
			}
			if (!Directory.Exists(Timeline._singleFilesFolder))
			{
				Directory.CreateDirectory(Timeline._singleFilesFolder);
			}
			string path = Path.Combine(Timeline._singleFilesFolder, text + ".xml");
			this.SaveSingle(path);
			this._singleFileNameField.text = text;
			this.UpdateSingleFilesPanel();
		}

		// Token: 0x060000AC RID: 172 RVA: 0x0000A8C8 File Offset: 0x00008AC8
		private void DeleteSingleFile()
		{
			UIUtility.DisplayConfirmationDialog(delegate(bool result)
			{
				if (result)
				{
					string path = Path.Combine(Timeline._singleFilesFolder, this._singleFileNameField.text + ".xml");
					if (File.Exists(path))
					{
						File.Delete(path);
						this._singleFileNameField.text = "";
						this.UpdateSingleFilesPanel();
					}
				}
			}, "Are you sure you want to delete this file?");
		}

		// Token: 0x060000AD RID: 173 RVA: 0x0000A8E0 File Offset: 0x00008AE0
		private void OpenKeyframeWindow()
		{
			this._keyframeWindow.gameObject.SetActive(true);
		}

		// Token: 0x060000AE RID: 174 RVA: 0x0000A8F4 File Offset: 0x00008AF4
		private void CloseKeyframeWindow()
		{
			this._keyframeWindow.gameObject.SetActive(false);
			this._selectedKeyframeCurvePointIndex = -1;
		}

		// Token: 0x060000AF RID: 175 RVA: 0x0000A910 File Offset: 0x00008B10
		private void SelectPreviousKeyframe()
		{
			if (this._selectedKeyframes.Count != 1)
			{
				return;
			}
			KeyValuePair<float, Keyframe> firstSelected = this._selectedKeyframes[0];
			KeyValuePair<float, Keyframe> keyValuePair = firstSelected.Value.parent.keyframes.LastOrDefault((KeyValuePair<float, Keyframe> f) => f.Key < firstSelected.Key);
			if (keyValuePair.Value != null)
			{
				this.SelectKeyframes(new KeyValuePair<float, Keyframe>[]
				{
					keyValuePair
				});
			}
		}

		// Token: 0x060000B0 RID: 176 RVA: 0x0000A994 File Offset: 0x00008B94
		private void SelectNextKeyframe()
		{
			if (this._selectedKeyframes.Count != 1)
			{
				return;
			}
			KeyValuePair<float, Keyframe> firstSelected = this._selectedKeyframes[0];
			KeyValuePair<float, Keyframe> keyValuePair = firstSelected.Value.parent.keyframes.FirstOrDefault((KeyValuePair<float, Keyframe> f) => f.Key > firstSelected.Key);
			if (keyValuePair.Value != null)
			{
				this.SelectKeyframes(new KeyValuePair<float, Keyframe>[]
				{
					keyValuePair
				});
			}
		}

		// Token: 0x060000B1 RID: 177 RVA: 0x0000AA18 File Offset: 0x00008C18
		private void UseCurrentTime()
		{
			float time = this._playbackTime % this._duration;
			this.SaveKeyframeTime(time);
			this.UpdateKeyframeTimeTextField();
		}

		// Token: 0x060000B2 RID: 178 RVA: 0x0000AA44 File Offset: 0x00008C44
		private void DragAtCurrentTime()
		{
			float num = this._playbackTime % this._duration;
			float num2 = this._selectedKeyframes.Min((KeyValuePair<float, Keyframe> k) => k.Key);
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				float key = num + keyValuePair.Key - num2;
				Keyframe keyframe;
				if (keyValuePair.Value.parent.keyframes.TryGetValue(key, out keyframe) && keyframe != keyValuePair.Value)
				{
					return;
				}
			}
			foreach (KeyValuePair<float, Keyframe> keyValuePair2 in this._selectedKeyframes)
			{
				keyValuePair2.Value.parent.keyframes.Remove(keyValuePair2.Key);
			}
			for (int i = 0; i < this._selectedKeyframes.Count; i++)
			{
				KeyValuePair<float, Keyframe> keyValuePair3 = this._selectedKeyframes[i];
				float key2 = num + keyValuePair3.Key - num2;
				keyValuePair3.Value.parent.keyframes.Add(key2, keyValuePair3.Value);
				this._selectedKeyframes[i] = new KeyValuePair<float, Keyframe>(key2, keyValuePair3.Value);
			}
			this.UpdateKeyframeTimeTextField();
			this.ExecuteDelayed(new Action(this.UpdateCursor2), 1);
			this.UpdateGrid();
		}

		// Token: 0x060000B3 RID: 179 RVA: 0x0000AC04 File Offset: 0x00008E04
		private void UpdateSelectedKeyframeTime(string s)
		{
			float num = this.ParseTime(this._keyframeTimeTextField.text);
			if (num < 0f)
			{
				return;
			}
			this.SaveKeyframeTime(num);
		}

		// Token: 0x060000B4 RID: 180 RVA: 0x0000AC3C File Offset: 0x00008E3C
		private void UseCurrentValue()
		{
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				keyValuePair.Value.value = keyValuePair.Value.parent.GetValue();
			}
			this.UpdateKeyframeValueText();
		}

		// Token: 0x060000B5 RID: 181 RVA: 0x0000ACB4 File Offset: 0x00008EB4
		private void OnCurveMouseDown(PointerEventData eventData)
		{
			Vector2 vector;
			if (eventData.button == 2 && !Input.GetKey(306) && RectTransformUtility.ScreenPointToLocalPointInRectangle(this._curveContainer.rectTransform, eventData.position, eventData.pressEventCamera, ref vector))
			{
				float num = vector.x / this._curveContainer.rectTransform.rect.width;
				float num2 = vector.y / this._curveContainer.rectTransform.rect.height;
				if (Input.GetKey(304))
				{
					float num3 = num % 0.041666668f;
					if (num3 / 0.041666668f > 0.5f)
					{
						num += 0.041666668f - num3;
					}
					else
					{
						num -= num3;
					}
					num3 = num2 % 0.041666668f;
					if (num3 / 0.041666668f > 0.5f)
					{
						num2 += 0.041666668f - num3;
					}
					else
					{
						num2 -= num3;
					}
				}
				Keyframe keyframe;
				keyframe..ctor(num, num2);
				if (keyframe.time < 0f || keyframe.time > 1f || keyframe.value < 0f || keyframe.value > 1f)
				{
					return;
				}
				this._selectedKeyframeCurvePointIndex = this._selectedKeyframes[0].Value.curve.AddKey(keyframe);
				this.SaveKeyframeCurve();
				this.UpdateCurve();
			}
		}

		// Token: 0x060000B6 RID: 182 RVA: 0x0000AE34 File Offset: 0x00009034
		private void UpdateCurvePointTime(string s)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex >= 1 && this._selectedKeyframeCurvePointIndex < curve.length - 1)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				float v;
				if (float.TryParse(this._curveTimeInputField.text, out v))
				{
					v = Mathf.Clamp(v, 0.001f, 0.999f);
					if (!curve.keys.Any((Keyframe k) => k.time == v))
					{
						keyframe.time = v;
						curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
						this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
						this.SaveKeyframeCurve();
					}
				}
			}
			this.UpdateCurvePointTime();
			this.UpdateCurve();
		}

		// Token: 0x060000B7 RID: 183 RVA: 0x0000AF1C File Offset: 0x0000911C
		private void UpdateCurvePointTime(float f)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex >= 1 && this._selectedKeyframeCurvePointIndex < curve.length - 1)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				float v = Mathf.Clamp(this._curveTimeSlider.value, 0.001f, 0.999f);
				if (!curve.keys.Any((Keyframe k) => k.time == v))
				{
					keyframe.time = v;
					curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
					this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
					this.SaveKeyframeCurve();
				}
			}
			this.UpdateCurvePointTime();
			this.UpdateCurve();
		}

		// Token: 0x060000B8 RID: 184 RVA: 0x0000AFF0 File Offset: 0x000091F0
		private void UpdateCurvePointTime()
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			Keyframe keyframe;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				keyframe = curve[this._selectedKeyframeCurvePointIndex];
			}
			else
			{
				keyframe = default(Keyframe);
			}
			this._curveTimeInputField.text = keyframe.time.ToString("0.00000");
			this._curveTimeSlider.SetValueNoCallback(keyframe.time);
		}

		// Token: 0x060000B9 RID: 185 RVA: 0x0000B084 File Offset: 0x00009284
		private void UpdateCurvePointValue(string s)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex >= 1 && this._selectedKeyframeCurvePointIndex < curve.length - 1)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				float value;
				if (float.TryParse(this._curveValueInputField.text, out value))
				{
					keyframe.value = value;
					curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
					this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
					this.SaveKeyframeCurve();
				}
			}
			this.UpdateCurvePointValue();
			this.UpdateCurve();
		}

		// Token: 0x060000BA RID: 186 RVA: 0x0000B128 File Offset: 0x00009328
		private void UpdateCurvePointValue(float f)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex >= 1 && this._selectedKeyframeCurvePointIndex < curve.length - 1)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				keyframe.value = this._curveValueSlider.value;
				curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
				this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
				this.SaveKeyframeCurve();
			}
			this.UpdateCurvePointValue();
			this.UpdateCurve();
		}

		// Token: 0x060000BB RID: 187 RVA: 0x0000B1BC File Offset: 0x000093BC
		private void UpdateCurvePointValue()
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			Keyframe keyframe;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				keyframe = curve[this._selectedKeyframeCurvePointIndex];
			}
			else
			{
				keyframe = default(Keyframe);
			}
			this._curveValueInputField.text = keyframe.value.ToString("0.00000");
			this._curveValueSlider.SetValueNoCallback(keyframe.value);
		}

		// Token: 0x060000BC RID: 188 RVA: 0x0000B250 File Offset: 0x00009450
		private void UpdateCurvePointInTangent(string s)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				float num;
				if (float.TryParse(this._curveInTangentInputField.text, out num))
				{
					if (num == 90f || num == -90f)
					{
						keyframe.inTangent = float.NegativeInfinity;
					}
					else
					{
						keyframe.inTangent = Mathf.Tan(num * 0.017453292f);
					}
					curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
					this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
					this.SaveKeyframeCurve();
				}
			}
			this.UpdateCurvePointInTangent();
			this.UpdateCurve();
		}

		// Token: 0x060000BD RID: 189 RVA: 0x0000B324 File Offset: 0x00009524
		private void UpdateCurvePointInTangent(float f)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				if (this._curveInTangentSlider.value == 90f || this._curveInTangentSlider.value == -90f)
				{
					keyframe.inTangent = float.PositiveInfinity;
				}
				else
				{
					keyframe.inTangent = Mathf.Tan(this._curveInTangentSlider.value * 0.017453292f);
				}
				curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
				this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
				this.SaveKeyframeCurve();
			}
			this.UpdateCurvePointInTangent();
			this.UpdateCurve();
		}

		// Token: 0x060000BE RID: 190 RVA: 0x0000B3FC File Offset: 0x000095FC
		private void UpdateCurvePointInTangent()
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			Keyframe keyframe;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				keyframe = curve[this._selectedKeyframeCurvePointIndex];
			}
			else
			{
				keyframe = default(Keyframe);
			}
			float value = Mathf.Atan(keyframe.inTangent) * 57.29578f;
			this._curveInTangentInputField.text = value.ToString("0.000");
			this._curveInTangentSlider.SetValueNoCallback(value);
		}

		// Token: 0x060000BF RID: 191 RVA: 0x0000B494 File Offset: 0x00009694
		private void UpdateCurvePointOutTangent(string s)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				float num;
				if (float.TryParse(this._curveOutTangentInputField.text, out num))
				{
					if (num == 90f || num == -90f)
					{
						keyframe.outTangent = float.NegativeInfinity;
					}
					else
					{
						keyframe.outTangent = Mathf.Tan(num * 0.017453292f);
					}
					curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
					this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
					this.SaveKeyframeCurve();
				}
			}
			this.UpdateCurvePointOutTangent();
			this.UpdateCurve();
		}

		// Token: 0x060000C0 RID: 192 RVA: 0x0000B568 File Offset: 0x00009768
		private void UpdateCurvePointOutTangent(float f)
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				Keyframe keyframe = curve[this._selectedKeyframeCurvePointIndex];
				if (this._curveOutTangentSlider.value == 90f || this._curveOutTangentSlider.value == -90f)
				{
					keyframe.outTangent = float.NegativeInfinity;
				}
				else
				{
					keyframe.outTangent = Mathf.Tan(this._curveOutTangentSlider.value * 0.017453292f);
				}
				curve.RemoveKey(this._selectedKeyframeCurvePointIndex);
				this._selectedKeyframeCurvePointIndex = curve.AddKey(keyframe);
				this.SaveKeyframeCurve();
			}
			this.UpdateCurvePointOutTangent();
			this.UpdateCurve();
		}

		// Token: 0x060000C1 RID: 193 RVA: 0x0000B640 File Offset: 0x00009840
		private void UpdateCurvePointOutTangent()
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			Keyframe keyframe;
			if (this._selectedKeyframeCurvePointIndex != -1 && this._selectedKeyframeCurvePointIndex < curve.length)
			{
				keyframe = curve[this._selectedKeyframeCurvePointIndex];
			}
			else
			{
				keyframe = default(Keyframe);
			}
			float value = Mathf.Atan(keyframe.outTangent) * 57.29578f;
			this._curveOutTangentInputField.text = value.ToString("0.000");
			this._curveOutTangentSlider.SetValueNoCallback(value);
		}

		// Token: 0x060000C2 RID: 194 RVA: 0x0000B6D8 File Offset: 0x000098D8
		private void CopyKeyframeCurve()
		{
			this._copiedKeyframeCurve.keys = this._selectedKeyframes[0].Value.curve.keys;
		}

		// Token: 0x060000C3 RID: 195 RVA: 0x0000B714 File Offset: 0x00009914
		private void PasteKeyframeCurve()
		{
			this._selectedKeyframes[0].Value.curve.keys = this._copiedKeyframeCurve.keys;
			this.SaveKeyframeCurve();
			this.UpdateCurve();
		}

		// Token: 0x060000C4 RID: 196 RVA: 0x0000B75C File Offset: 0x0000995C
		private void InvertKeyframeCurve()
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			Keyframe[] keys = curve.keys;
			for (int i = 0; i < keys.Length; i++)
			{
				Keyframe keyframe = keys[i];
				keyframe.time = 1f - keyframe.time;
				keyframe.value = 1f - keyframe.value;
				float inTangent = keyframe.inTangent;
				keyframe.inTangent = keyframe.outTangent;
				keyframe.outTangent = inTangent;
				keys[i] = keyframe;
			}
			Array.Reverse(keys);
			curve.keys = keys;
			this.SaveKeyframeCurve();
			this.UpdateCurve();
		}

		// Token: 0x060000C5 RID: 197 RVA: 0x0000B814 File Offset: 0x00009A14
		private void ApplyKeyframeCurvePreset(AnimationCurve preset)
		{
			this._selectedKeyframes[0].Value.curve = new AnimationCurve(preset.keys);
			this.SaveKeyframeCurve();
			this.UpdateCurve();
		}

		// Token: 0x060000C6 RID: 198 RVA: 0x0000B858 File Offset: 0x00009A58
		private void UpdateCursor2()
		{
			if (!this._keyframeWindow.activeSelf)
			{
				return;
			}
			if (this._selectedKeyframes.Count != 1)
			{
				this._cursor2.gameObject.SetActive(false);
				return;
			}
			KeyValuePair<float, Keyframe> selectedKeyframe = this._selectedKeyframes[0];
			if (this._playbackTime < selectedKeyframe.Key)
			{
				this._cursor2.gameObject.SetActive(false);
				return;
			}
			KeyValuePair<float, Keyframe> keyValuePair = selectedKeyframe.Value.parent.keyframes.FirstOrDefault((KeyValuePair<float, Keyframe> k) => k.Key > selectedKeyframe.Key);
			if (keyValuePair.Value != null && this._playbackTime <= keyValuePair.Key)
			{
				this._cursor2.gameObject.SetActive(true);
				float num = (this._playbackTime - selectedKeyframe.Key) / (keyValuePair.Key - selectedKeyframe.Key);
				this._cursor2.anchoredPosition = new Vector2(num * this._curveContainer.rectTransform.rect.width, this._cursor2.anchoredPosition.y);
				return;
			}
			this._cursor2.gameObject.SetActive(false);
		}

		// Token: 0x060000C7 RID: 199 RVA: 0x0000B9A8 File Offset: 0x00009BA8
		private void DeleteSelectedKeyframes()
		{
			UIUtility.DisplayConfirmationDialog(delegate(bool result)
			{
				if (result)
				{
					this.DeleteKeyframes(this._selectedKeyframes, true);
				}
			}, (this._selectedKeyframes.Count == 1) ? "Are you sure you want to delete this Keyframe?" : "Are you sure you want to delete these Keyframes?");
		}

		// Token: 0x060000C8 RID: 200 RVA: 0x0000B9DC File Offset: 0x00009BDC
		private void DeleteKeyframes(params KeyValuePair<float, Keyframe>[] keyframes)
		{
			this.DeleteKeyframes(keyframes, true);
		}

		// Token: 0x060000C9 RID: 201 RVA: 0x0000B9E8 File Offset: 0x00009BE8
		private void DeleteKeyframes(IEnumerable<KeyValuePair<float, Keyframe>> keyframes, bool removeInterpolables = true)
		{
			float num = float.PositiveInfinity;
			float num2 = float.NegativeInfinity;
			keyframes = keyframes.ToList<KeyValuePair<float, Keyframe>>();
			foreach (KeyValuePair<float, Keyframe> keyValuePair in keyframes)
			{
				if (keyValuePair.Value != null)
				{
					if (keyValuePair.Key < num)
					{
						num = keyValuePair.Key;
					}
					if (keyValuePair.Key > num2)
					{
						num2 = keyValuePair.Key;
					}
					try
					{
						keyValuePair.Value.parent.keyframes.Remove(keyValuePair.Key);
						if (removeInterpolables && keyValuePair.Value.parent.keyframes.Count == 0)
						{
							this.RemoveInterpolable(keyValuePair.Value.parent);
						}
					}
					catch (Exception ex)
					{
						string[] array = new string[8];
						array[0] = "Timeline: Couldn't delete keyframe with time \"";
						array[1] = keyValuePair.Key.ToString();
						array[2] = "\" and value \"";
						int num3 = 3;
						Keyframe value = keyValuePair.Value;
						array[num3] = ((value != null) ? value.ToString() : null);
						array[4] = "\" from interpolable \"";
						int num4 = 5;
						Interpolable parent = keyValuePair.Value.parent;
						array[num4] = ((parent != null) ? parent.ToString() : null);
						array[6] = "\"\n";
						int num5 = 7;
						Exception ex2 = ex;
						array[num5] = ((ex2 != null) ? ex2.ToString() : null);
						Debug.LogError(string.Concat(array));
					}
				}
			}
			if (Input.GetKey(308))
			{
				double num6 = (double)(num2 - num + this._blockLength / (float)this._divisions);
				HashSet<Interpolable> hashSet = new HashSet<Interpolable>();
				foreach (KeyValuePair<float, Keyframe> keyValuePair2 in keyframes)
				{
					if (!hashSet.Contains(keyValuePair2.Value.parent))
					{
						hashSet.Add(keyValuePair2.Value.parent);
						foreach (KeyValuePair<float, Keyframe> keyValuePair3 in keyValuePair2.Value.parent.keyframes.ToList<KeyValuePair<float, Keyframe>>())
						{
							if (keyValuePair3.Key > num)
							{
								this.MoveKeyframe(keyValuePair3.Value, (float)((double)keyValuePair3.Key - num6));
							}
						}
					}
				}
			}
			this._selectedKeyframes.RemoveAll((KeyValuePair<float, Keyframe> elem) => elem.Value == null || keyframes.Any((KeyValuePair<float, Keyframe> k) => k.Value == elem.Value));
			this.UpdateGrid();
			this.UpdateKeyframeWindow(false);
		}

		// Token: 0x060000CA RID: 202 RVA: 0x0000BD04 File Offset: 0x00009F04
		private void SaveKeyframeTime(float time)
		{
			for (int i = 0; i < this._selectedKeyframes.Count; i++)
			{
				KeyValuePair<float, Keyframe> keyValuePair = this._selectedKeyframes[i];
				Keyframe keyframe;
				if (!keyValuePair.Value.parent.keyframes.TryGetValue(time, out keyframe) || keyframe == keyValuePair.Value)
				{
					keyValuePair.Value.parent.keyframes.Remove(keyValuePair.Key);
					keyValuePair.Value.parent.keyframes.Add(time, keyValuePair.Value);
					this._selectedKeyframes[i] = new KeyValuePair<float, Keyframe>(time, keyValuePair.Value);
				}
			}
			this.UpdateKeyframeTimeTextField();
			this.ExecuteDelayed(new Action(this.UpdateCursor2), 1);
			this.UpdateGrid();
		}

		// Token: 0x060000CB RID: 203 RVA: 0x0000BDE0 File Offset: 0x00009FE0
		private void SaveKeyframeCurve()
		{
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				keyValuePair.Value.curve = new AnimationCurve(curve.keys);
			}
		}

		// Token: 0x060000CC RID: 204 RVA: 0x0000BE64 File Offset: 0x0000A064
		private void UpdateKeyframeWindow(bool changeShowState = true)
		{
			if (this._selectedKeyframes.Count == 0)
			{
				this.CloseKeyframeWindow();
				return;
			}
			if (changeShowState)
			{
				this.OpenKeyframeWindow();
			}
			IEnumerable<IGrouping<Interpolable, KeyValuePair<float, Keyframe>>> source = from e in this._selectedKeyframes
			group e by e.Value.parent;
			bool flag = source.Count<IGrouping<Interpolable, KeyValuePair<float, Keyframe>>>() == 1;
			Interpolable key = source.First<IGrouping<Interpolable, KeyValuePair<float, Keyframe>>>().Key;
			this._keyframeInterpolableNameText.text = (flag ? (string.IsNullOrEmpty(key.alias) ? key.name : key.alias) : "Multiple selected");
			this._keyframeSelectPrevButton.interactable = (this._selectedKeyframes.Count == 1);
			this._keyframeSelectNextButton.interactable = (this._selectedKeyframes.Count == 1);
			this._keyframeTimeTextField.interactable = source.All((IGrouping<Interpolable, KeyValuePair<float, Keyframe>> g) => g.Count<KeyValuePair<float, Keyframe>>() == 1);
			this._keyframeUseCurrentTimeButton.interactable = this._keyframeTimeTextField.interactable;
			this._keyframeDeleteButtonText.text = ((this._selectedKeyframes.Count == 1) ? "Delete" : "Delete all");
			this.UpdateKeyframeTimeTextField();
			this.UpdateKeyframeValueText();
			this.ExecuteDelayed(new Action(this.UpdateCurve), 1);
			this.ExecuteDelayed(new Action(this.UpdateCursor2), 1);
		}

		// Token: 0x060000CD RID: 205 RVA: 0x0000BFF4 File Offset: 0x0000A1F4
		private void UpdateKeyframeTimeTextField()
		{
			float key = this._selectedKeyframes[0].Key;
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				if (key != keyValuePair.Key)
				{
					this._keyframeTimeTextField.text = "Multiple times";
					return;
				}
			}
			this._keyframeTimeTextField.text = string.Format("{0:00}:{1:00.########}", Mathf.FloorToInt(key / 60f), key % 60f);
		}

		// Token: 0x060000CE RID: 206 RVA: 0x0000C0B0 File Offset: 0x0000A2B0
		private void UpdateKeyframeValueText()
		{
			object value = this._selectedKeyframes[0].Value.value;
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				if (!value.Equals(keyValuePair.Value.value))
				{
					this._keyframeValueText.text = "Multiple values";
					return;
				}
			}
			this._keyframeValueText.text = ((value != null) ? value.ToString() : "null");
		}

		// Token: 0x060000CF RID: 207 RVA: 0x0000C16C File Offset: 0x0000A36C
		private void UpdateCurve()
		{
			if (this._selectedKeyframes.Count == 0)
			{
				return;
			}
			AnimationCurve curve = this._selectedKeyframes[0].Value.curve;
			foreach (KeyValuePair<float, Keyframe> keyValuePair in this._selectedKeyframes)
			{
				if (!this.CompareCurves(curve, keyValuePair.Value.curve))
				{
					curve = null;
					break;
				}
			}
			int num = 0;
			if (curve != null)
			{
				num = curve.length;
				for (int i = 0; i < this._curveTexture.width; i++)
				{
					float num2 = curve.Evaluate((float)i / ((float)this._curveTexture.width - 1f));
					this._curveTexture.SetPixel(i, 0, new Color(num2, num2, num2, num2));
				}
			}
			else
			{
				for (int j = 0; j < this._curveTexture.width; j++)
				{
					this._curveTexture.SetPixel(j, 0, new Color(2f, 2f, 2f, 2f));
				}
			}
			this._curveTexture.Apply(false);
			this._curveContainer.material.mainTexture = this._curveTexture;
			this._curveContainer.enabled = false;
			this._curveContainer.enabled = true;
			int k = 0;
			Action<PointerEventData> <>9__5;
			for (int l = 0; l < num; l++)
			{
				Keyframe keyframe = curve[l];
				Timeline.CurveKeyframeDisplay display;
				if (k < this._displayedCurveKeyframes.Count)
				{
					display = this._displayedCurveKeyframes[k];
				}
				else
				{
					display = new Timeline.CurveKeyframeDisplay();
					display.gameObject = Object.Instantiate<GameObject>(this._curveKeyframePrefab);
					display.gameObject.hideFlags = 0;
					display.image = display.gameObject.transform.Find("RawImage").GetComponent<RawImage>();
					display.gameObject.transform.SetParent(this._curveContainer.transform);
					display.gameObject.transform.localScale = Vector3.one;
					display.gameObject.transform.localPosition = Vector3.zero;
					display.pointerDownHandler = display.gameObject.AddComponent<PointerDownHandler>();
					display.scrollHandler = display.gameObject.AddComponent<ScrollHandler>();
					display.dragHandler = display.gameObject.AddComponent<DragHandler>();
					display.pointerEnterHandler = display.gameObject.AddComponent<PointerEnterHandler>();
					this._displayedCurveKeyframes.Add(display);
				}
				int i1 = l;
				display.pointerDownHandler.onPointerDown = delegate(PointerEventData e)
				{
					if (e.button == null)
					{
						this._selectedKeyframeCurvePointIndex = i1;
						this.UpdateCurve();
					}
					if (i1 == 0 || i1 == curve.length - 1)
					{
						return;
					}
					if (e.button == 2 && Input.GetKey(306))
					{
						foreach (KeyValuePair<float, Keyframe> keyValuePair2 in this._selectedKeyframes)
						{
							keyValuePair2.Value.curve.RemoveKey(i1);
						}
						this.UpdateCurve();
					}
				};
				display.scrollHandler.onScroll = delegate(PointerEventData e)
				{
					Keyframe keyframe2 = curve[i1];
					float num3 = (e.scrollDelta.y > 0f) ? 0.017453292f : -0.017453292f;
					foreach (KeyValuePair<float, Keyframe> keyValuePair2 in this._selectedKeyframes)
					{
						keyValuePair2.Value.curve.RemoveKey(i1);
					}
					if (Input.GetKey(306))
					{
						keyframe2.inTangent = Mathf.Tan(Mathf.Atan(keyframe2.inTangent) + num3);
					}
					else if (Input.GetKey(308))
					{
						keyframe2.outTangent = Mathf.Tan(Mathf.Atan(keyframe2.outTangent) + num3);
					}
					else
					{
						keyframe2.inTangent = Mathf.Tan(Mathf.Atan(keyframe2.inTangent) + num3);
						keyframe2.outTangent = Mathf.Tan(Mathf.Atan(keyframe2.outTangent) + num3);
					}
					foreach (KeyValuePair<float, Keyframe> keyValuePair3 in this._selectedKeyframes)
					{
						keyValuePair3.Value.curve.AddKey(keyframe2);
					}
					this.UpdateCurve();
				};
				display.dragHandler.onDrag = delegate(PointerEventData e)
				{
					if (i1 == 0 || i1 == curve.length - 1)
					{
						return;
					}
					Vector2 vector;
					if (RectTransformUtility.ScreenPointToLocalPointInRectangle(this._curveContainer.rectTransform, e.position, e.pressEventCamera, ref vector))
					{
						vector.x = Mathf.Clamp(vector.x, 0f, this._curveContainer.rectTransform.rect.width);
						vector.y = Mathf.Clamp(vector.y, 0f, this._curveContainer.rectTransform.rect.height);
						if (Input.GetKey(304))
						{
							Vector2 vector2;
							vector2..ctor(this._curveContainer.rectTransform.rect.width * 0.041666668f, this._curveContainer.rectTransform.rect.height * 0.041666668f);
							float num3 = vector.x % vector2.x;
							if (num3 / vector2.x > 0.5f)
							{
								vector.x += vector2.x - num3;
							}
							else
							{
								vector.x -= num3;
							}
							num3 = vector.y % vector2.y;
							if (num3 / vector2.y > 0.5f)
							{
								vector.y += vector2.y - num3;
							}
							else
							{
								vector.y -= num3;
							}
						}
						((RectTransform)display.gameObject.transform).anchoredPosition = vector;
					}
				};
				display.dragHandler.onEndDrag = delegate(PointerEventData e)
				{
					if (i1 == 0 || i1 == curve.length - 1)
					{
						return;
					}
					Vector2 vector;
					if (RectTransformUtility.ScreenPointToLocalPointInRectangle(this._curveContainer.rectTransform, e.position, e.pressEventCamera, ref vector))
					{
						float time = vector.x / this._curveContainer.rectTransform.rect.width;
						float num3 = vector.y / this._curveContainer.rectTransform.rect.height;
						if (Input.GetKey(304))
						{
							float num4 = time % 0.041666668f;
							if (num4 / 0.041666668f > 0.5f)
							{
								time += 0.041666668f - num4;
							}
							else
							{
								time -= num4;
							}
							num4 = num3 % 0.041666668f;
							if (num4 / 0.041666668f > 0.5f)
							{
								num3 += 0.041666668f - num4;
							}
							else
							{
								num3 -= num4;
							}
						}
						if (time > 0f && time < 1f && num3 >= 0f && num3 <= 1f && !curve.keys.Any((Keyframe k) => k.time == time))
						{
							Keyframe keyframe2 = curve[i1];
							keyframe2.time = time;
							keyframe2.value = num3;
							foreach (KeyValuePair<float, Keyframe> keyValuePair2 in this._selectedKeyframes)
							{
								keyValuePair2.Value.curve.RemoveKey(i1);
								keyValuePair2.Value.curve.AddKey(keyframe2);
							}
						}
						this.UpdateCurve();
					}
				};
				display.pointerEnterHandler.onPointerEnter = delegate(PointerEventData e)
				{
					this._tooltip.transform.parent.gameObject.SetActive(true);
					Keyframe keyframe2 = curve[i1];
					this._tooltip.text = string.Format("T: {0:0.000}, V: {1:0.###}\nIn: {2:0.#}, Out:{3:0.#}", new object[]
					{
						keyframe2.time,
						keyframe2.value,
						Mathf.Atan(keyframe2.inTangent) * 57.29578f,
						Mathf.Atan(keyframe2.outTangent) * 57.29578f
					});
				};
				PointerEnterHandler pointerEnterHandler = display.pointerEnterHandler;
				Action<PointerEventData> onPointerExit;
				if ((onPointerExit = <>9__5) == null)
				{
					onPointerExit = (<>9__5 = delegate(PointerEventData e)
					{
						this._tooltip.transform.parent.gameObject.SetActive(false);
					});
				}
				pointerEnterHandler.onPointerExit = onPointerExit;
				display.image.color = ((l == this._selectedKeyframeCurvePointIndex) ? Color.green : new Color32(44, 153, 160, byte.MaxValue));
				display.gameObject.SetActive(true);
				((RectTransform)display.gameObject.transform).anchoredPosition = new Vector2(keyframe.time * this._curveContainer.rectTransform.rect.width, keyframe.value * this._curveContainer.rectTransform.rect.height);
				k++;
			}
			while (k < this._displayedCurveKeyframes.Count)
			{
				this._displayedCurveKeyframes[k].gameObject.SetActive(false);
				k++;
			}
			this.UpdateCurvePointTime();
			this.UpdateCurvePointValue();
			this.UpdateCurvePointInTangent();
			this.UpdateCurvePointOutTangent();
		}

		// Token: 0x060000D0 RID: 208 RVA: 0x0000C6B4 File Offset: 0x0000A8B4
		private bool CompareCurves(AnimationCurve x, AnimationCurve y)
		{
			if (x.length != y.length)
			{
				return false;
			}
			for (int i = 0; i < x.length; i++)
			{
				Keyframe keyframe = x.keys[i];
				Keyframe keyframe2 = y.keys[i];
				if (keyframe.time != keyframe2.time || keyframe.value != keyframe2.value || keyframe.inTangent != keyframe2.inTangent || keyframe.outTangent != keyframe2.outTangent)
				{
					return false;
				}
			}
			return true;
		}

		// Token: 0x060000D1 RID: 209 RVA: 0x0000C758 File Offset: 0x0000A958
		private void SceneLoad(string path, XmlNode node)
		{
			if (node == null)
			{
				return;
			}
			this.ExecuteDelayed(delegate()
			{
				this._interpolables.Clear();
				this._interpolablesTree.Clear();
				this._selectedOCI = null;
				this._selectedKeyframes.Clear();
				List<KeyValuePair<int, ObjectCtrlInfo>> dic = new SortedDictionary<int, ObjectCtrlInfo>(Singleton<Studio>.Instance.dicObjectCtrl).ToList<KeyValuePair<int, ObjectCtrlInfo>>();
				this.SceneLoad(node, dic);
				this.UpdateInterpolablesView();
				this.CloseKeyframeWindow();
			}, 20);
		}

		// Token: 0x060000D2 RID: 210 RVA: 0x0000C7A0 File Offset: 0x0000A9A0
		private void SceneImport(string path, XmlNode node)
		{
			Dictionary<int, ObjectCtrlInfo> toIgnore = new Dictionary<int, ObjectCtrlInfo>(Singleton<Studio>.Instance.dicObjectCtrl);
			Func<KeyValuePair<int, ObjectCtrlInfo>, bool> <>9__1;
			this.ExecuteDelayed(delegate()
			{
				IEnumerable<KeyValuePair<int, ObjectCtrlInfo>> dicObjectCtrl = Singleton<Studio>.Instance.dicObjectCtrl;
				Func<KeyValuePair<int, ObjectCtrlInfo>, bool> predicate;
				if ((predicate = <>9__1) == null)
				{
					predicate = (<>9__1 = ((KeyValuePair<int, ObjectCtrlInfo> e) => !toIgnore.ContainsKey(e.Key)));
				}
				List<KeyValuePair<int, ObjectCtrlInfo>> dic = (from e in dicObjectCtrl.Where(predicate)
				orderby Timeline.SceneInfo_Import_Patches._newToOldKeys[e.Key]
				select e).ToList<KeyValuePair<int, ObjectCtrlInfo>>();
				this.SceneLoad(node, dic);
				this.UpdateInterpolablesView();
			}, 20);
		}

		// Token: 0x060000D3 RID: 211 RVA: 0x0000C7F0 File Offset: 0x0000A9F0
		private void SceneWrite(string path, XmlTextWriter writer)
		{
			List<KeyValuePair<int, ObjectCtrlInfo>> dic = new SortedDictionary<int, ObjectCtrlInfo>(Singleton<Studio>.Instance.dicObjectCtrl).ToList<KeyValuePair<int, ObjectCtrlInfo>>();
			writer.WriteAttributeString("duration", XmlConvert.ToString(this._duration));
			writer.WriteAttributeString("blockLength", XmlConvert.ToString(this._blockLength));
			writer.WriteAttributeString("divisions", XmlConvert.ToString(this._divisions));
			writer.WriteAttributeString("timeScale", XmlConvert.ToString(Time.timeScale));
			foreach (INode interpolableNode in this._interpolablesTree.tree)
			{
				this.WriteInterpolableTree(interpolableNode, writer, dic, null);
			}
		}

		// Token: 0x060000D4 RID: 212 RVA: 0x0000C8C0 File Offset: 0x0000AAC0
		private void SceneLoad(XmlNode node, List<KeyValuePair<int, ObjectCtrlInfo>> dic)
		{
			this.ReadInterpolableTree(node, dic, null, null);
			if (node.Attributes["duration"] != null)
			{
				this._duration = XmlConvert.ToSingle(node.Attributes["duration"].Value);
			}
			else
			{
				this._duration = 0f;
				foreach (KeyValuePair<int, Interpolable> keyValuePair in this._interpolables)
				{
					KeyValuePair<float, Keyframe> keyValuePair2 = keyValuePair.Value.keyframes.LastOrDefault<KeyValuePair<float, Keyframe>>();
					if (this._duration < keyValuePair2.Key)
					{
						this._duration = keyValuePair2.Key;
					}
				}
				if (Mathf.Approximately(this._duration, 0f))
				{
					this._duration = 10f;
				}
			}
			this._blockLength = ((node.Attributes["blockLength"] != null) ? XmlConvert.ToSingle(node.Attributes["blockLength"].Value) : 10f);
			this._divisions = ((node.Attributes["divisions"] != null) ? XmlConvert.ToInt32(node.Attributes["divisions"].Value) : 10);
			Time.timeScale = ((node.Attributes["timeScale"] != null) ? XmlConvert.ToSingle(node.Attributes["timeScale"].Value) : 1f);
			this._blockLengthInputField.text = this._blockLength.ToString();
			this._divisionsInputField.text = this._divisions.ToString();
			this._speedInputField.text = Time.timeScale.ToString("0.#####");
		}

		// Token: 0x060000D5 RID: 213 RVA: 0x0000CAB4 File Offset: 0x0000ACB4
		private void LoadSingle(string path)
		{
			List<KeyValuePair<int, ObjectCtrlInfo>> dic = new SortedDictionary<int, ObjectCtrlInfo>(Singleton<Studio>.Instance.dicObjectCtrl).ToList<KeyValuePair<int, ObjectCtrlInfo>>();
			XmlDocument xmlDocument = new XmlDocument();
			try
			{
				xmlDocument.Load(path);
				this.ReadInterpolableTree(xmlDocument.FirstChild, dic, this._selectedOCI, null);
				OCIChar ocichar = this._selectedOCI as OCIChar;
				if (ocichar != null)
				{
					ocichar.LoadAnime(xmlDocument.FirstChild.ReadInt("animationGroup"), xmlDocument.FirstChild.ReadInt("animationCategory"), xmlDocument.FirstChild.ReadInt("animationNo"), 0f);
				}
			}
			catch (Exception ex)
			{
				string str = "Timeline: Could not load data for OCI.\n";
				XmlNode firstChild = xmlDocument.FirstChild;
				string str2 = (firstChild != null) ? firstChild.ToString() : null;
				string str3 = "\n";
				Exception ex2 = ex;
				Debug.LogError(str + str2 + str3 + ((ex2 != null) ? ex2.ToString() : null));
			}
			this.UpdateInterpolablesView();
		}

		// Token: 0x060000D6 RID: 214 RVA: 0x0000CBA4 File Offset: 0x0000ADA4
		private void SaveSingle(string path)
		{
			using (XmlTextWriter xmlTextWriter = new XmlTextWriter(path, Encoding.UTF8))
			{
				List<KeyValuePair<int, ObjectCtrlInfo>> dic = new SortedDictionary<int, ObjectCtrlInfo>(Singleton<Studio>.Instance.dicObjectCtrl).ToList<KeyValuePair<int, ObjectCtrlInfo>>();
				xmlTextWriter.WriteStartElement("root");
				OCIChar ocichar = this._selectedOCI as OCIChar;
				if (ocichar != null)
				{
					OICharInfo.AnimeInfo animeInfo = ocichar.oiCharInfo.animeInfo;
					xmlTextWriter.WriteValue("animationCategory", animeInfo.category);
					xmlTextWriter.WriteValue("animationGroup", animeInfo.group);
					xmlTextWriter.WriteValue("animationNo", animeInfo.no);
				}
				foreach (INode interpolableNode in this._interpolablesTree.tree)
				{
					this.WriteInterpolableTree(interpolableNode, xmlTextWriter, dic, (LeafNode<Interpolable> leafNode) => leafNode.obj.oci == this._selectedOCI);
				}
				xmlTextWriter.WriteEndElement();
			}
		}

		// Token: 0x060000D7 RID: 215 RVA: 0x0000CCB4 File Offset: 0x0000AEB4
		private void ReadInterpolableTree(XmlNode groupNode, List<KeyValuePair<int, ObjectCtrlInfo>> dic, ObjectCtrlInfo overrideOci = null, GroupNode<Timeline.InterpolableGroup> group = null)
		{
			foreach (object obj in groupNode.ChildNodes)
			{
				XmlNode xmlNode = (XmlNode)obj;
				string name = xmlNode.Name;
				if (name != null)
				{
					if (!(name == "interpolable"))
					{
						if (name == "interpolableGroup")
						{
							string value = xmlNode.Attributes["name"].Value;
							GroupNode<Timeline.InterpolableGroup> group2 = this._interpolablesTree.AddGroup(new Timeline.InterpolableGroup
							{
								name = value
							}, group);
							this.ReadInterpolableTree(xmlNode, dic, overrideOci, group2);
						}
					}
					else
					{
						this.ReadInterpolable(xmlNode, dic, overrideOci, group);
					}
				}
			}
		}

		// Token: 0x060000D8 RID: 216 RVA: 0x0000CD94 File Offset: 0x0000AF94
		private void WriteInterpolableTree(INode interpolableNode, XmlTextWriter writer, List<KeyValuePair<int, ObjectCtrlInfo>> dic, Func<LeafNode<Interpolable>, bool> predicate = null)
		{
			INodeType type = interpolableNode.type;
			if (type != INodeType.Leaf)
			{
				if (type != INodeType.Group)
				{
					return;
				}
				GroupNode<Timeline.InterpolableGroup> groupNode = (GroupNode<Timeline.InterpolableGroup>)interpolableNode;
				bool flag = true;
				if (predicate != null)
				{
					flag = this._interpolablesTree.Any(groupNode, predicate);
				}
				if (flag)
				{
					writer.WriteStartElement("interpolableGroup");
					writer.WriteAttributeString("name", groupNode.obj.name);
					foreach (INode interpolableNode2 in groupNode.children)
					{
						this.WriteInterpolableTree(interpolableNode2, writer, dic, predicate);
					}
					writer.WriteEndElement();
				}
			}
			else
			{
				LeafNode<Interpolable> leafNode = (LeafNode<Interpolable>)interpolableNode;
				if (predicate == null || predicate(leafNode))
				{
					this.WriteInterpolable(leafNode.obj, writer, dic);
					return;
				}
			}
		}

		// Token: 0x060000D9 RID: 217 RVA: 0x0000CE80 File Offset: 0x0000B080
		private void ReadInterpolable(XmlNode interpolableNode, List<KeyValuePair<int, ObjectCtrlInfo>> dic, ObjectCtrlInfo overrideOci = null, GroupNode<Timeline.InterpolableGroup> group = null)
		{
			bool flag = false;
			Interpolable interpolable = null;
			try
			{
				if (interpolableNode.Name == "interpolable")
				{
					string ownerId = interpolableNode.Attributes["owner"].Value;
					ObjectCtrlInfo objectCtrlInfo = null;
					if (overrideOci != null)
					{
						objectCtrlInfo = overrideOci;
					}
					else if (interpolableNode.Attributes["objectIndex"] != null)
					{
						int num = XmlConvert.ToInt32(interpolableNode.Attributes["objectIndex"].Value);
						if (num >= dic.Count)
						{
							return;
						}
						objectCtrlInfo = dic[num].Value;
					}
					string id = interpolableNode.Attributes["id"].Value;
					InterpolableModel interpolableModel = this._interpolableModelsList.Find((InterpolableModel i) => i.owner == ownerId && i.id == id);
					if (interpolableModel != null)
					{
						if (interpolableModel.readParameterFromXml != null)
						{
							interpolable = new Interpolable(objectCtrlInfo, interpolableModel.readParameterFromXml(objectCtrlInfo, interpolableNode), interpolableModel);
						}
						else
						{
							interpolable = new Interpolable(objectCtrlInfo, interpolableModel);
						}
						interpolable.enabled = (interpolableNode.Attributes["enabled"] == null || XmlConvert.ToBoolean(interpolableNode.Attributes["enabled"].Value));
						if (interpolableNode.Attributes["bgColorR"] != null)
						{
							interpolable.color = new Color(XmlConvert.ToSingle(interpolableNode.Attributes["bgColorR"].Value), XmlConvert.ToSingle(interpolableNode.Attributes["bgColorG"].Value), XmlConvert.ToSingle(interpolableNode.Attributes["bgColorB"].Value));
						}
						if (interpolableNode.Attributes["alias"] != null)
						{
							interpolable.alias = interpolableNode.Attributes["alias"].Value;
						}
						if (!this._interpolables.ContainsKey(interpolable.GetHashCode()))
						{
							this._interpolables.Add(interpolable.GetHashCode(), interpolable);
							this._interpolablesTree.AddLeaf(interpolable, group);
							flag = true;
							foreach (object obj in interpolableNode.ChildNodes)
							{
								XmlNode xmlNode = (XmlNode)obj;
								if (xmlNode.Name == "keyframe")
								{
									float key = XmlConvert.ToSingle(xmlNode.Attributes["time"].Value);
									object value = interpolable.ReadValueFromXml(xmlNode);
									List<Keyframe> list = new List<Keyframe>();
									foreach (object obj2 in xmlNode.ChildNodes)
									{
										XmlNode xmlNode2 = (XmlNode)obj2;
										if (xmlNode2.Name == "curveKeyframe")
										{
											Keyframe item;
											item..ctor(XmlConvert.ToSingle(xmlNode2.Attributes["time"].Value), XmlConvert.ToSingle(xmlNode2.Attributes["value"].Value), XmlConvert.ToSingle(xmlNode2.Attributes["inTangent"].Value), XmlConvert.ToSingle(xmlNode2.Attributes["outTangent"].Value));
											list.Add(item);
										}
									}
									AnimationCurve curve;
									if (list.Count == 0)
									{
										curve = AnimationCurve.Linear(0f, 0f, 1f, 1f);
									}
									else
									{
										curve = new AnimationCurve(list.ToArray());
									}
									Keyframe value2 = new Keyframe(value, interpolable, curve);
									interpolable.keyframes.Add(key, value2);
								}
							}
						}
					}
				}
			}
			catch (Exception ex)
			{
				string str = "Timeline: Couldn't load interpolable with the following XML:\n";
				string outerXml = interpolableNode.OuterXml;
				string str2 = "\n";
				Exception ex2 = ex;
				Debug.LogError(str + outerXml + str2 + ((ex2 != null) ? ex2.ToString() : null));
				if (flag)
				{
					this.RemoveInterpolable(interpolable);
				}
			}
		}

		// Token: 0x060000DA RID: 218 RVA: 0x0000D300 File Offset: 0x0000B500
		private void WriteInterpolable(Interpolable interpolable, XmlTextWriter writer, List<KeyValuePair<int, ObjectCtrlInfo>> dic)
		{
			if (interpolable.keyframes.Count == 0)
			{
				return;
			}
			using (StringWriter stringWriter = new StringWriter())
			{
				using (XmlTextWriter xmlTextWriter = new XmlTextWriter(stringWriter))
				{
					try
					{
						int num = -1;
						if (interpolable.oci != null)
						{
							num = dic.FindIndex((KeyValuePair<int, ObjectCtrlInfo> e) => e.Value == interpolable.oci);
							if (num == -1)
							{
								return;
							}
						}
						xmlTextWriter.WriteStartElement("interpolable");
						xmlTextWriter.WriteAttributeString("enabled", XmlConvert.ToString(interpolable.enabled));
						xmlTextWriter.WriteAttributeString("owner", interpolable.owner);
						if (num != -1)
						{
							xmlTextWriter.WriteAttributeString("objectIndex", XmlConvert.ToString(num));
						}
						xmlTextWriter.WriteAttributeString("id", interpolable.id);
						if (interpolable.writeParameterToXml != null)
						{
							interpolable.writeParameterToXml(interpolable.oci, xmlTextWriter, interpolable.parameter);
						}
						xmlTextWriter.WriteAttributeString("bgColorR", XmlConvert.ToString(interpolable.color.r));
						xmlTextWriter.WriteAttributeString("bgColorG", XmlConvert.ToString(interpolable.color.g));
						xmlTextWriter.WriteAttributeString("bgColorB", XmlConvert.ToString(interpolable.color.b));
						xmlTextWriter.WriteAttributeString("alias", interpolable.alias);
						foreach (KeyValuePair<float, Keyframe> keyValuePair in interpolable.keyframes)
						{
							xmlTextWriter.WriteStartElement("keyframe");
							xmlTextWriter.WriteAttributeString("time", XmlConvert.ToString(keyValuePair.Key));
							interpolable.WriteValueToXml(xmlTextWriter, keyValuePair.Value.value);
							foreach (Keyframe keyframe in keyValuePair.Value.curve.keys)
							{
								xmlTextWriter.WriteStartElement("curveKeyframe");
								xmlTextWriter.WriteAttributeString("time", XmlConvert.ToString(keyframe.time));
								xmlTextWriter.WriteAttributeString("value", XmlConvert.ToString(keyframe.value));
								xmlTextWriter.WriteAttributeString("inTangent", XmlConvert.ToString(keyframe.inTangent));
								xmlTextWriter.WriteAttributeString("outTangent", XmlConvert.ToString(keyframe.outTangent));
								xmlTextWriter.WriteEndElement();
							}
							xmlTextWriter.WriteEndElement();
						}
						xmlTextWriter.WriteEndElement();
					}
					catch (Exception ex)
					{
						string str = "Timeline: Couldn't save interpolable with the following value:\n";
						Interpolable interpolable2 = interpolable;
						string str2 = (interpolable2 != null) ? interpolable2.ToString() : null;
						string str3 = "\n";
						Exception ex2 = ex;
						Debug.LogError(str + str2 + str3 + ((ex2 != null) ? ex2.ToString() : null));
						return;
					}
				}
				writer.WriteRaw(stringWriter.ToString());
			}
		}

		// Token: 0x060000DB RID: 219 RVA: 0x0000D68C File Offset: 0x0000B88C
		private void OnDuplicate(ObjectCtrlInfo source, ObjectCtrlInfo destination)
		{
			Func<LeafNode<Interpolable>, bool> <>9__1;
			this.ExecuteDelayed(delegate()
			{
				List<KeyValuePair<int, ObjectCtrlInfo>> list = new SortedDictionary<int, ObjectCtrlInfo>(Singleton<Studio>.Instance.dicObjectCtrl).ToList<KeyValuePair<int, ObjectCtrlInfo>>();
				using (StringWriter stringWriter = new StringWriter())
				{
					using (XmlTextWriter xmlTextWriter = new XmlTextWriter(stringWriter))
					{
						xmlTextWriter.WriteStartElement("root");
						foreach (INode node in this._interpolablesTree.tree)
						{
							Timeline <>4__this = this;
							INode interpolableNode = node;
							XmlTextWriter writer = xmlTextWriter;
							List<KeyValuePair<int, ObjectCtrlInfo>> dic = list;
							Func<LeafNode<Interpolable>, bool> predicate;
							if ((predicate = <>9__1) == null)
							{
								predicate = (<>9__1 = ((LeafNode<Interpolable> leafNode) => leafNode.obj.oci == source));
							}
							<>4__this.WriteInterpolableTree(interpolableNode, writer, dic, predicate);
						}
						xmlTextWriter.WriteEndElement();
					}
					try
					{
						XmlDocument xmlDocument = new XmlDocument();
						xmlDocument.LoadXml(stringWriter.ToString());
						this.ReadInterpolableTree(xmlDocument.FirstChild, list, destination, null);
					}
					catch (Exception ex)
					{
						string str = "Timeline: Could not duplicate data for OCI.\n";
						StringWriter stringWriter2 = stringWriter;
						string str2 = (stringWriter2 != null) ? stringWriter2.ToString() : null;
						string str3 = "\n";
						Exception ex2 = ex;
						Debug.LogError(str + str2 + str3 + ((ex2 != null) ? ex2.ToString() : null));
					}
				}
			}, 20);
		}

		// Token: 0x0400002A RID: 42
		internal const string _name = "Timeline";

		// Token: 0x0400002B RID: 43
		private const string _version = "1.1.0";

		// Token: 0x0400002C RID: 44
		private const string _guid = "com.joan6694.illusionplugins.timeline";

		// Token: 0x0400002D RID: 45
		internal const string _ownerId = "Timeline";

		// Token: 0x0400002E RID: 46
		internal static Timeline _self;

		// Token: 0x0400002F RID: 47
		private static string _assemblyLocation;

		// Token: 0x04000030 RID: 48
		private static string _singleFilesFolder;

		// Token: 0x04000031 RID: 49
		private static bool _refreshInterpolablesListScheduled;

		// Token: 0x04000032 RID: 50
		private bool _loaded;

		// Token: 0x04000033 RID: 51
		private int _totalActiveExpressions;

		// Token: 0x04000034 RID: 52
		private int _currentExpressionIndex;

		// Token: 0x04000035 RID: 53
		private readonly HashSet<Expression> _allExpressions = new HashSet<Expression>();

		// Token: 0x04000036 RID: 54
		internal List<InterpolableModel> _interpolableModelsList = new List<InterpolableModel>();

		// Token: 0x04000037 RID: 55
		internal Dictionary<string, List<InterpolableModel>> _interpolableModelsDictionary = new Dictionary<string, List<InterpolableModel>>();

		// Token: 0x04000038 RID: 56
		private readonly Dictionary<string, int> _hardCodedOwnerOrder = new Dictionary<string, int>
		{
			{
				"Timeline",
				0
			},
			{
				"HSPE",
				1
			},
			{
				"KKPE",
				1
			},
			{
				"RendererEditor",
				2
			},
			{
				"NodesConstraints",
				3
			}
		};

		// Token: 0x04000039 RID: 57
		internal Dictionary<Transform, GuideObject> _allGuideObjects;

		// Token: 0x0400003A RID: 58
		internal HashSet<GuideObject> _selectedGuideObjects;

		// Token: 0x0400003B RID: 59
		private readonly List<Interpolable> _toDelete = new List<Interpolable>();

		// Token: 0x0400003C RID: 60
		private readonly Dictionary<int, Interpolable> _interpolables = new Dictionary<int, Interpolable>();

		// Token: 0x0400003D RID: 61
		private readonly Tree<Interpolable, Timeline.InterpolableGroup> _interpolablesTree = new Tree<Interpolable, Timeline.InterpolableGroup>();

		// Token: 0x0400003E RID: 62
		private const float _baseGridWidth = 300f;

		// Token: 0x0400003F RID: 63
		private const int _interpolableHeight = 32;

		// Token: 0x04000040 RID: 64
		private const float _curveGridCellSizePercent = 0.041666668f;

		// Token: 0x04000041 RID: 65
		private Canvas _ui;

		// Token: 0x04000042 RID: 66
		private Sprite _linkSprite;

		// Token: 0x04000043 RID: 67
		private Sprite _colorSprite;

		// Token: 0x04000044 RID: 68
		private Sprite _renameSprite;

		// Token: 0x04000045 RID: 69
		private Sprite _newFolderSprite;

		// Token: 0x04000046 RID: 70
		private Sprite _addSprite;

		// Token: 0x04000047 RID: 71
		private Sprite _addToFolderSprite;

		// Token: 0x04000048 RID: 72
		private Sprite _chevronUpSprite;

		// Token: 0x04000049 RID: 73
		private Sprite _chevronDownSprite;

		// Token: 0x0400004A RID: 74
		private Sprite _deleteSprite;

		// Token: 0x0400004B RID: 75
		private Sprite _checkboxSprite;

		// Token: 0x0400004C RID: 76
		private Sprite _checkboxCompositeSprite;

		// Token: 0x0400004D RID: 77
		private Sprite _selectAllSprite;

		// Token: 0x0400004E RID: 78
		private RectTransform _timelineWindow;

		// Token: 0x0400004F RID: 79
		private GameObject _helpPanel;

		// Token: 0x04000050 RID: 80
		private RectTransform _cursor;

		// Token: 0x04000051 RID: 81
		private RectTransform _grid;

		// Token: 0x04000052 RID: 82
		private RawImage _gridImage;

		// Token: 0x04000053 RID: 83
		private RectTransform _gridTop;

		// Token: 0x04000054 RID: 84
		private bool _isDraggingCursor;

		// Token: 0x04000055 RID: 85
		private ScrollRect _verticalScrollView;

		// Token: 0x04000056 RID: 86
		private ScrollRect _horizontalScrollView;

		// Token: 0x04000057 RID: 87
		private Toggle _allToggle;

		// Token: 0x04000058 RID: 88
		private InputField _interpolablesSearchField;

		// Token: 0x04000059 RID: 89
		private InputField _frameRateInputField;

		// Token: 0x0400005A RID: 90
		private InputField _timeInputField;

		// Token: 0x0400005B RID: 91
		private InputField _durationInputField;

		// Token: 0x0400005C RID: 92
		private InputField _blockLengthInputField;

		// Token: 0x0400005D RID: 93
		private InputField _divisionsInputField;

		// Token: 0x0400005E RID: 94
		private InputField _speedInputField;

		// Token: 0x0400005F RID: 95
		private GameObject _singleFilePrefab;

		// Token: 0x04000060 RID: 96
		private GameObject _singleFilesPanel;

		// Token: 0x04000061 RID: 97
		private RectTransform _singleFilesContainer;

		// Token: 0x04000062 RID: 98
		private InputField _singleFileNameField;

		// Token: 0x04000063 RID: 99
		private readonly List<Timeline.SingleFileDisplay> _displayedSingleFiles = new List<Timeline.SingleFileDisplay>();

		// Token: 0x04000064 RID: 100
		private float _zoomLevel = 1f;

		// Token: 0x04000065 RID: 101
		private RectTransform _textsContainer;

		// Token: 0x04000066 RID: 102
		private readonly List<Text> _timeTexts = new List<Text>();

		// Token: 0x04000067 RID: 103
		private RectTransform _resizeHandle;

		// Token: 0x04000068 RID: 104
		private GameObject _keyframeWindow;

		// Token: 0x04000069 RID: 105
		private Text _keyframeInterpolableNameText;

		// Token: 0x0400006A RID: 106
		private Button _keyframeSelectPrevButton;

		// Token: 0x0400006B RID: 107
		private Button _keyframeSelectNextButton;

		// Token: 0x0400006C RID: 108
		private InputField _keyframeTimeTextField;

		// Token: 0x0400006D RID: 109
		private Button _keyframeUseCurrentTimeButton;

		// Token: 0x0400006E RID: 110
		private Text _keyframeValueText;

		// Token: 0x0400006F RID: 111
		private Button _keyframeUseCurrentValueButton;

		// Token: 0x04000070 RID: 112
		private Text _keyframeDeleteButtonText;

		// Token: 0x04000071 RID: 113
		private GameObject _headerPrefab;

		// Token: 0x04000072 RID: 114
		private readonly List<Timeline.HeaderDisplay> _displayedOwnerHeader = new List<Timeline.HeaderDisplay>();

		// Token: 0x04000073 RID: 115
		private GameObject _interpolablePrefab;

		// Token: 0x04000074 RID: 116
		private GameObject _interpolableModelPrefab;

		// Token: 0x04000075 RID: 117
		private readonly List<Timeline.InterpolableDisplay> _displayedInterpolables = new List<Timeline.InterpolableDisplay>();

		// Token: 0x04000076 RID: 118
		private readonly List<Timeline.InterpolableModelDisplay> _displayedInterpolableModels = new List<Timeline.InterpolableModelDisplay>();

		// Token: 0x04000077 RID: 119
		private readonly List<float> _gridHeights = new List<float>();

		// Token: 0x04000078 RID: 120
		private readonly List<RawImage> _interpolableSeparators = new List<RawImage>();

		// Token: 0x04000079 RID: 121
		private RectTransform _keyframesContainer;

		// Token: 0x0400007A RID: 122
		private RectTransform _miscContainer;

		// Token: 0x0400007B RID: 123
		private GameObject _keyframePrefab;

		// Token: 0x0400007C RID: 124
		private readonly List<Timeline.KeyframeDisplay> _displayedKeyframes = new List<Timeline.KeyframeDisplay>();

		// Token: 0x0400007D RID: 125
		private Material _keyframesBackgroundMaterial;

		// Token: 0x0400007E RID: 126
		private Text _tooltip;

		// Token: 0x0400007F RID: 127
		private GameObject _curveKeyframePrefab;

		// Token: 0x04000080 RID: 128
		private RawImage _curveContainer;

		// Token: 0x04000081 RID: 129
		private readonly Texture2D _curveTexture = new Texture2D(512, 1, 18, false, true);

		// Token: 0x04000082 RID: 130
		private InputField _curveTimeInputField;

		// Token: 0x04000083 RID: 131
		private Slider _curveTimeSlider;

		// Token: 0x04000084 RID: 132
		private InputField _curveValueInputField;

		// Token: 0x04000085 RID: 133
		private Slider _curveValueSlider;

		// Token: 0x04000086 RID: 134
		private InputField _curveInTangentInputField;

		// Token: 0x04000087 RID: 135
		private Slider _curveInTangentSlider;

		// Token: 0x04000088 RID: 136
		private InputField _curveOutTangentInputField;

		// Token: 0x04000089 RID: 137
		private Slider _curveOutTangentSlider;

		// Token: 0x0400008A RID: 138
		private RectTransform _cursor2;

		// Token: 0x0400008B RID: 139
		private readonly List<Timeline.CurveKeyframeDisplay> _displayedCurveKeyframes = new List<Timeline.CurveKeyframeDisplay>();

		// Token: 0x0400008C RID: 140
		private readonly AnimationCurve _linePreset = AnimationCurve.Linear(0f, 0f, 1f, 1f);

		// Token: 0x0400008D RID: 141
		private readonly AnimationCurve _topPreset = new AnimationCurve(new Keyframe[]
		{
			new Keyframe(0f, 0f, 2f, 2f),
			new Keyframe(1f, 1f, 0f, 0f)
		});

		// Token: 0x0400008E RID: 142
		private readonly AnimationCurve _bottomPreset = new AnimationCurve(new Keyframe[]
		{
			new Keyframe(0f, 0f, 0f, 0f),
			new Keyframe(1f, 1f, 2f, 2f)
		});

		// Token: 0x0400008F RID: 143
		private readonly AnimationCurve _hermitePreset = new AnimationCurve(new Keyframe[]
		{
			new Keyframe(0f, 0f, 0f, 0f),
			new Keyframe(1f, 1f, 0f, 0f)
		});

		// Token: 0x04000090 RID: 144
		private readonly AnimationCurve _stairsPreset = new AnimationCurve(new Keyframe[]
		{
			new Keyframe(0f, 0f, 0f, 0f),
			new Keyframe(1f, 1f, float.PositiveInfinity, 0f)
		});

		// Token: 0x04000091 RID: 145
		private bool _isPlaying;

		// Token: 0x04000092 RID: 146
		private float _startTime;

		// Token: 0x04000093 RID: 147
		private float _playbackTime;

		// Token: 0x04000094 RID: 148
		private float _duration = 10f;

		// Token: 0x04000095 RID: 149
		private float _blockLength = 10f;

		// Token: 0x04000096 RID: 150
		private int _divisions = 10;

		// Token: 0x04000097 RID: 151
		private int _desiredFrameRate = 60;

		// Token: 0x04000098 RID: 152
		private readonly List<Interpolable> _selectedInterpolables = new List<Interpolable>();

		// Token: 0x04000099 RID: 153
		private readonly List<KeyValuePair<float, Keyframe>> _selectedKeyframes = new List<KeyValuePair<float, Keyframe>>();

		// Token: 0x0400009A RID: 154
		private readonly List<KeyValuePair<float, Keyframe>> _copiedKeyframes = new List<KeyValuePair<float, Keyframe>>();

		// Token: 0x0400009B RID: 155
		private readonly List<KeyValuePair<float, Keyframe>> _cutKeyframes = new List<KeyValuePair<float, Keyframe>>();

		// Token: 0x0400009C RID: 156
		private readonly Dictionary<Timeline.KeyframeDisplay, float> _selectedKeyframesXOffset = new Dictionary<Timeline.KeyframeDisplay, float>();

		// Token: 0x0400009D RID: 157
		private double _keyframeSelectionSize;

		// Token: 0x0400009E RID: 158
		private int _selectedKeyframeCurvePointIndex = -1;

		// Token: 0x0400009F RID: 159
		private ObjectCtrlInfo _selectedOCI;

		// Token: 0x040000A0 RID: 160
		private GuideObject _selectedGuideObject;

		// Token: 0x040000A1 RID: 161
		private readonly AnimationCurve _copiedKeyframeCurve = new AnimationCurve();

		// Token: 0x040000A2 RID: 162
		private bool _isAreaSelecting;

		// Token: 0x040000A3 RID: 163
		private Vector2 _areaSelectFirstPoint;

		// Token: 0x040000A4 RID: 164
		private RectTransform _selectionArea;

		// Token: 0x0200006E RID: 110
		private class HeaderDisplay
		{
			// Token: 0x04000275 RID: 629
			public GameObject gameObject;

			// Token: 0x04000276 RID: 630
			public LayoutElement layoutElement;

			// Token: 0x04000277 RID: 631
			public RectTransform container;

			// Token: 0x04000278 RID: 632
			public Text name;

			// Token: 0x04000279 RID: 633
			public InputField inputField;

			// Token: 0x0400027A RID: 634
			public bool expanded = true;

			// Token: 0x0400027B RID: 635
			public GroupNode<Timeline.InterpolableGroup> group;
		}

		// Token: 0x0200006F RID: 111
		private class InterpolableDisplay
		{
			// Token: 0x0400027C RID: 636
			public GameObject gameObject;

			// Token: 0x0400027D RID: 637
			public RectTransform container;

			// Token: 0x0400027E RID: 638
			public CanvasGroup group;

			// Token: 0x0400027F RID: 639
			public Toggle enabled;

			// Token: 0x04000280 RID: 640
			public Text name;

			// Token: 0x04000281 RID: 641
			public InputField inputField;

			// Token: 0x04000282 RID: 642
			public Image background;

			// Token: 0x04000283 RID: 643
			public Image selectedOutline;

			// Token: 0x04000284 RID: 644
			public RawImage gridBackground;

			// Token: 0x04000285 RID: 645
			public LeafNode<Interpolable> interpolable;
		}

		// Token: 0x02000070 RID: 112
		private class InterpolableModelDisplay
		{
			// Token: 0x04000286 RID: 646
			public GameObject gameObject;

			// Token: 0x04000287 RID: 647
			public Text name;

			// Token: 0x04000288 RID: 648
			public InterpolableModel model;
		}

		// Token: 0x02000071 RID: 113
		private class KeyframeDisplay
		{
			// Token: 0x04000289 RID: 649
			public GameObject gameObject;

			// Token: 0x0400028A RID: 650
			public RawImage image;

			// Token: 0x0400028B RID: 651
			public Keyframe keyframe;
		}

		// Token: 0x02000072 RID: 114
		private class CurveKeyframeDisplay
		{
			// Token: 0x0400028C RID: 652
			public GameObject gameObject;

			// Token: 0x0400028D RID: 653
			public RawImage image;

			// Token: 0x0400028E RID: 654
			public PointerDownHandler pointerDownHandler;

			// Token: 0x0400028F RID: 655
			public ScrollHandler scrollHandler;

			// Token: 0x04000290 RID: 656
			public DragHandler dragHandler;

			// Token: 0x04000291 RID: 657
			public PointerEnterHandler pointerEnterHandler;
		}

		// Token: 0x02000073 RID: 115
		private class SingleFileDisplay
		{
			// Token: 0x04000292 RID: 658
			public Toggle toggle;

			// Token: 0x04000293 RID: 659
			public Text text;
		}

		// Token: 0x02000074 RID: 116
		private class InterpolableGroup
		{
			// Token: 0x04000294 RID: 660
			public string name;

			// Token: 0x04000295 RID: 661
			public bool expanded = true;
		}

		// Token: 0x02000075 RID: 117
		[HarmonyPatch(typeof(Expression), "Start")]
		private static class Expression_Start_Patches
		{
			// Token: 0x0600044C RID: 1100 RVA: 0x0001E518 File Offset: 0x0001C718
			private static void Prefix(Expression __instance)
			{
				Timeline._self._allExpressions.Add(__instance);
			}
		}

		// Token: 0x02000076 RID: 118
		[HarmonyPatch(typeof(Expression), "OnDestroy")]
		private static class Expression_OnDestroy_Patches
		{
			// Token: 0x0600044D RID: 1101 RVA: 0x0001E52C File Offset: 0x0001C72C
			private static void Prefix(Expression __instance)
			{
				Timeline._self._allExpressions.Remove(__instance);
			}
		}

		// Token: 0x02000077 RID: 119
		[HarmonyPatch(typeof(Expression), "LateUpdate")]
		[HarmonyBefore(new string[]
		{
			"com.joan6694.illusionplugins.nodesconstraints"
		})]
		private static class Expression_LateUpdate_Patches
		{
			// Token: 0x0600044E RID: 1102 RVA: 0x0001E540 File Offset: 0x0001C740
			private static void Postfix()
			{
				Timeline._self._currentExpressionIndex++;
				if (Timeline._self._currentExpressionIndex == Timeline._self._totalActiveExpressions)
				{
					Timeline._self.PostLateUpdate();
				}
			}
		}

		// Token: 0x02000078 RID: 120
		[HarmonyPatch(typeof(Studio), "Duplicate")]
		private class Studio_Duplicate_Patches
		{
			// Token: 0x0600044F RID: 1103 RVA: 0x0001E578 File Offset: 0x0001C778
			public static void Postfix(Studio __instance)
			{
				foreach (KeyValuePair<int, int> keyValuePair in Timeline.SceneInfo_Import_Patches._newToOldKeys)
				{
					ObjectCtrlInfo objectCtrlInfo;
					ObjectCtrlInfo objectCtrlInfo2;
					if (__instance.dicObjectCtrl.TryGetValue(keyValuePair.Value, out objectCtrlInfo) && __instance.dicObjectCtrl.TryGetValue(keyValuePair.Key, out objectCtrlInfo2) && ((objectCtrlInfo is OCIChar && objectCtrlInfo2 is OCIChar) || (objectCtrlInfo is OCIItem && objectCtrlInfo2 is OCIItem)))
					{
						Timeline._self.OnDuplicate(objectCtrlInfo, objectCtrlInfo2);
					}
				}
			}
		}

		// Token: 0x02000079 RID: 121
		[HarmonyPatch(typeof(ObjectInfo), "Load", new Type[]
		{
			typeof(BinaryReader),
			typeof(Version),
			typeof(bool),
			typeof(bool)
		})]
		private static class ObjectInfo_Load_Patches
		{
			// Token: 0x06000451 RID: 1105 RVA: 0x0001E63C File Offset: 0x0001C83C
			private static IEnumerable<CodeInstruction> Transpiler(IEnumerable<CodeInstruction> instructions)
			{
				int count = 0;
				List<CodeInstruction> list = instructions.ToList<CodeInstruction>();
				foreach (CodeInstruction inst in list)
				{
					yield return inst;
					if (count != 2 && inst.ToString().Contains("ReadInt32"))
					{
						int num = count + 1;
						count = num;
						if (count == 2)
						{
							yield return new CodeInstruction(OpCodes.Ldarg_0, null);
							yield return new CodeInstruction(OpCodes.Call, typeof(Timeline.ObjectInfo_Load_Patches).GetMethod("Injected", BindingFlags.Static | BindingFlags.NonPublic));
						}
					}
					inst = null;
				}
				List<CodeInstruction>.Enumerator enumerator = default(List<CodeInstruction>.Enumerator);
				yield break;
				yield break;
			}

			// Token: 0x06000452 RID: 1106 RVA: 0x0001E64C File Offset: 0x0001C84C
			private static int Injected(int originalIndex, ObjectInfo __instance)
			{
				Timeline.SceneInfo_Import_Patches._newToOldKeys.Add(__instance.dicKey, originalIndex);
				return originalIndex;
			}
		}

		// Token: 0x0200007A RID: 122
		[HarmonyPatch(typeof(SceneInfo), "Import", new Type[]
		{
			typeof(BinaryReader),
			typeof(Version)
		})]
		private static class SceneInfo_Import_Patches
		{
			// Token: 0x06000453 RID: 1107 RVA: 0x0001E660 File Offset: 0x0001C860
			private static void Prefix()
			{
				Timeline.SceneInfo_Import_Patches._newToOldKeys.Clear();
			}

			// Token: 0x04000296 RID: 662
			internal static readonly Dictionary<int, int> _newToOldKeys = new Dictionary<int, int>();
		}

		// Token: 0x0200007B RID: 123
		[HarmonyPatch(typeof(GuideSelect), "OnPointerClick", new Type[]
		{
			typeof(PointerEventData)
		})]
		private static class GuideSelect_OnPointerClick_Patches
		{
			// Token: 0x06000455 RID: 1109 RVA: 0x0001E678 File Offset: 0x0001C878
			private static void Postfix()
			{
				GuideObject go = Singleton<GuideObjectManager>.Instance.selectObject;
				if (go != null && Input.GetKey(308))
				{
					Timeline._self.HighlightInterpolable(Timeline._self._interpolables.FirstOrDefault(delegate(KeyValuePair<int, Interpolable> i)
					{
						GuideObject guideObject = i.Value.parameter as GuideObject;
						return guideObject != null && guideObject == go;
					}).Value);
				}
			}
		}

		// Token: 0x0200007C RID: 124
		private static class OCI_OnDelete_Patches
		{
			// Token: 0x06000456 RID: 1110 RVA: 0x0001E6EC File Offset: 0x0001C8EC
			public static void ManualPatch(HarmonyInstance harmony)
			{
				foreach (Type type in from myType in Assembly.GetAssembly(typeof(ObjectCtrlInfo)).GetTypes()
				where myType.IsClass && !myType.IsAbstract && myType.IsSubclassOf(typeof(ObjectCtrlInfo))
				select myType)
				{
					try
					{
						harmony.Patch(type.GetMethod("OnDelete", AccessTools.all), new HarmonyMethod(typeof(Timeline.OCI_OnDelete_Patches).GetMethod("Prefix", BindingFlags.Static | BindingFlags.NonPublic)), null, null);
					}
					catch (Exception ex)
					{
						string str = "Timeline: Could not patch OnDelete of type ";
						string name = type.Name;
						string str2 = "\n";
						Exception ex2 = ex;
						Debug.LogWarning(str + name + str2 + ((ex2 != null) ? ex2.ToString() : null));
					}
				}
			}

			// Token: 0x06000457 RID: 1111 RVA: 0x0001E7E8 File Offset: 0x0001C9E8
			private static void Prefix(object __instance)
			{
				ObjectCtrlInfo oci = __instance as ObjectCtrlInfo;
				if (oci != null)
				{
					Timeline._self.RemoveInterpolables((from i in Timeline._self._interpolables
					where i.Value.oci == oci
					select i.Value).ToList<Interpolable>());
				}
			}
		}
	}
}
